import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

const DRIVE_GAP_MS = 5 * 60 * 1000; // 5 minutes gap = new drive

// Page size for the telemetry fetch. PostgREST caps every response at
// max_rows (1000 in config.toml), and a session spans many 1000-row chunks
// (docs/07 § Chunking), so a single unpaged select silently truncates.
const TELEMETRY_PAGE_SIZE = 1000;

// Longest gap between two samples that distance integration will bridge.
// Samples arrive every few seconds (the dev seed uses 5 s), so a gap past
// 30 s inside a drive means samples were lost; assuming constant speed across
// it would invent distance (~0.8 km at 100 km/h). Such intervals are skipped,
// which makes distance_km a lower bound rather than a guess. Gaps past
// DRIVE_GAP_MS never reach here -- they split the drive instead.
const MAX_DISTANCE_INTERVAL_MS = 30 * 1000;

// A drive as handed to complete_sync_session(). vehicle_id, sync_session_id
// and has_anomaly are deliberately absent: the function takes the first two
// from the locked session row and always inserts has_anomaly = false.
type SegmentedDrive = {
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  distance_km: number | null;
  peak_metrics: Record<string, number>;
  summary_metrics: Record<string, number>;
};

// complete_sync_session()'s return value (migration 20261007000001).
type CompleteSyncResult = {
  outcome: 'completed' | 'already_completed' | 'not_found';
  drives_created: number;
};

function isCompleteSyncResult(value: unknown): value is CompleteSyncResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.outcome === 'completed' || v.outcome === 'already_completed' || v.outcome === 'not_found') &&
    typeof v.drives_created === 'number'
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return errorResponse('session_id is required', 400);
    }

    const signingSecret = Deno.env.get('DEVICE_JWT_SIGNING_SECRET')!;
    const token = authHeader.replace('Bearer ', '');
    const device_id = await verifyDeviceJwt(token, signingSecret);
    if (!device_id) {
      return errorResponse('Invalid or expired device token', 401);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify session belongs to this device
    const { data: session, error: sessionError } = await adminClient
      .from('sync_sessions')
      .select('id, device_id, vehicle_id, status, row_count')
      .eq('id', session_id)
      .eq('device_id', device_id)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sync session not found', 404);
    }

    // Cheap pre-check only — an OPTIMISATION, not the correctness boundary.
    // Two overlapping calls can both pass it; the authoritative check is the
    // one complete_sync_session() makes under the session row lock.
    if (session.status === 'completed') {
      return okResponse({ message: 'Already completed' });
    }

    // Get all telemetry for this session sorted by timestamp, paged past the
    // max_rows cap. `id` breaks timestamp ties so page boundaries are stable
    // (no row skipped or repeated). Paging stops on an EMPTY page, not a short
    // one, so it stays correct even if a server's max_rows is below the page
    // size.
    const telemetry: Array<{ id: string; timestamp: string; metrics: unknown }> = [];
    for (;;) {
      const { data: page, error: telemetryError } = await adminClient
        .from('telemetry')
        .select('id, timestamp, metrics')
        .eq('sync_session_id', session_id)
        .order('timestamp', { ascending: true })
        .order('id', { ascending: true })
        .range(telemetry.length, telemetry.length + TELEMETRY_PAGE_SIZE - 1);

      if (telemetryError) {
        return errorResponse('Failed to fetch telemetry', 500);
      }
      if (!page || page.length === 0) break;
      telemetry.push(...page);
    }

    // Drive boundary detection
    const drives: SegmentedDrive[] = [];

    if (telemetry.length > 0) {
      let driveStart = 0;

      for (let i = 1; i <= telemetry.length; i++) {
        const isLast = i === telemetry.length;
        const gap = isLast ? DRIVE_GAP_MS + 1 :
          new Date(telemetry[i].timestamp).getTime() -
          new Date(telemetry[i - 1].timestamp).getTime();

        if (gap > DRIVE_GAP_MS || isLast) {
          // Rows driveStart..i-1: on a gap, row i opens the next drive; on the
          // last pass i === telemetry.length, so the final row is included.
          const driveTelemetry = telemetry.slice(driveStart, i);
          if (driveTelemetry.length > 0) {
            const startedAt = driveTelemetry[0].timestamp;
            const endedAt = driveTelemetry[driveTelemetry.length - 1].timestamp;
            const durationSeconds = Math.floor(
              (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
            );

            // Compute peak and summary metrics
            const peakMetrics: Record<string, number> = {};
            const sumMetrics: Record<string, number> = {};
            const countMetrics: Record<string, number> = {};

            for (const row of driveTelemetry) {
              const m = row.metrics as Record<string, number>;
              for (const [key, val] of Object.entries(m)) {
                if (typeof val === 'number') {
                  // Seed from the value itself on first sight, not 0 — a metric
                  // that only ever goes negative (boost under vacuum, sub-zero
                  // temps, negative fuel trims) must not record a false peak of 0.
                  peakMetrics[key] = key in peakMetrics
                    ? Math.max(peakMetrics[key], val)
                    : val;
                  sumMetrics[key] = (sumMetrics[key] ?? 0) + val;
                  countMetrics[key] = (countMetrics[key] ?? 0) + 1;
                }
              }
            }

            const avgMetrics: Record<string, number> = {};
            for (const key of Object.keys(sumMetrics)) {
              avgMetrics[key] = Math.round((sumMetrics[key] / countMetrics[key]) * 100) / 100;
            }

            // started_at / ended_at are passed through as the exact strings
            // PostgREST returned, so the RPC's BETWEEN backfill matches the
            // stored timestamps without any precision loss.
            drives.push({
              started_at: startedAt,
              ended_at: endedAt,
              duration_seconds: durationSeconds,
              distance_km: computeDistanceKm(driveTelemetry),
              peak_metrics: peakMetrics,
              summary_metrics: avgMetrics,
            });
          }
          driveStart = i;
        }
      }
    }

    // Persist everything in ONE transaction: insert the drives, backfill
    // telemetry.drive_id, set the session 'completed'. The three used to be
    // separate requests that could diverge (an unchecked status write left
    // drives with no agent run; a retry re-inserted every drive). See
    // migration 20261007000001. The agent is enqueued by
    // sync_session_completed_enqueue, which fires on the status update inside
    // that same transaction — so it is enqueued iff the drives committed.
    const { data: rpcData, error: rpcError } = await adminClient.rpc('complete_sync_session', {
      p_session_id: session_id,
      p_device_id: device_id,
      p_drives: drives,
    });

    if (rpcError || !isCompleteSyncResult(rpcData)) {
      console.error('complete_sync_session failed:', rpcError ?? rpcData);

      // Best-effort and COSMETIC ONLY: the authoritative state is that nothing
      // committed — no drives, no drive_id, session not completed — and the
      // 500 below makes the device retry. 'failed' exists so the app's
      // failure banner (docs/07 § Sync failure handling) has something to
      // show. `.neq('completed')` matters: if the RPC actually committed and
      // only the response was lost, flipping the session back to 'failed'
      // would let a retry process it a second time.
      const { error: failedWriteError } = await adminClient
        .from('sync_sessions')
        .update({
          status: 'failed',
          error_message: `Completion failed and was rolled back: ${rpcError?.message ?? 'unexpected RPC result'}`,
        })
        .eq('id', session_id)
        .neq('status', 'completed');

      if (failedWriteError) {
        console.error('sync_sessions failed-status write error (cosmetic):', failedWriteError);
      }

      return errorResponse('Failed to complete sync session', 500);
    }

    if (rpcData.outcome === 'not_found') {
      // Only reachable if the session was deleted between the read above and
      // the RPC's lock.
      return errorResponse('Sync session not found', 404);
    }

    if (rpcData.outcome === 'already_completed') {
      // A concurrent call completed it while this one was waiting on the lock.
      return okResponse({ message: 'Already completed' });
    }

    // NOTE: last_sync_at lives on `devices`, not `vehicles` — the vehicles
    // table has no such column, so a prior vehicles.last_sync_at write here
    // was a silent no-op. Removed; devices below is the correct target.
    //
    // Checked but deliberately NOT fatal: the session has already committed
    // as 'completed', so failing here would only make the device retry into
    // "Already completed". A stale last_sync_at / last_seen_at loses no data.
    const { error: deviceError } = await adminClient
      .from('devices')
      .update({
        last_sync_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', device_id);

    if (deviceError) {
      console.error('devices last_sync_at update error (non-fatal):', deviceError);
    }

    // `dtcs_added` counts DTC rows TAGGED WITH THIS SESSION, not DTCs newly
    // created by it (a re-reported active code is tagged too). The key is
    // kept as-is because it is part of the documented firmware contract
    // (docs/07); renaming it waits on confirmation from the hardware project
    // (docs/11). Non-fatal for the same reason as the devices write.
    const { count: dtcsInSession, error: dtcCountError } = await adminClient
      .from('dtcs')
      .select('id', { count: 'exact', head: true })
      .eq('sync_session_id', session_id);

    if (dtcCountError) {
      console.error('dtcs count error (non-fatal, reporting 0):', dtcCountError);
    }

    return okResponse({
      drives_created: rpcData.drives_created,
      dtcs_added: dtcsInSession ?? 0,
    });

  } catch (err) {
    console.error('device_sync_complete error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// Distance by trapezoidal integration of speed_kph over time. Absent is never
// zero: a sample without a numeric speed_kph breaks the chain, so the
// intervals either side of it are skipped rather than read as 0 km/h. NULL
// when no interval could be used (fewer than 2 usable adjacent samples) --
// NULL means unknown, 0 means stationary, and those are different claims.
function computeDistanceKm(
  rows: Array<{ timestamp: string; metrics: unknown }>,
): number | null {
  let distanceKm = 0;
  let intervalsUsed = 0;
  let prev: { t: number; speed: number } | null = null;

  for (const row of rows) {
    const speed = (row.metrics as Record<string, unknown> | null)?.speed_kph;
    if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0) {
      prev = null;
      continue;
    }
    const t = new Date(row.timestamp).getTime();
    if (prev && t - prev.t <= MAX_DISTANCE_INTERVAL_MS) {
      distanceKm += ((prev.speed + speed) / 2) * ((t - prev.t) / 3_600_000);
      intervalsUsed++;
    }
    prev = { t, speed };
  }

  return intervalsUsed > 0 ? Math.round(distanceKm * 100) / 100 : null;
}

async function verifyDeviceJwt(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const data = parts[0] + '.' + parts[1];
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.device_id ?? null;
  } catch {
    return null;
  }
}
