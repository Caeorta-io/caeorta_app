import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

const DRIVE_GAP_MS = 5 * 60 * 1000; // 5 minutes gap = new drive

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

    if (session.status === 'completed') {
      return okResponse({ message: 'Already completed' });
    }

    // Get all telemetry for this session sorted by timestamp
    const { data: telemetry, error: telemetryError } = await adminClient
      .from('telemetry')
      .select('id, timestamp, metrics')
      .eq('sync_session_id', session_id)
      .order('timestamp', { ascending: true });

    if (telemetryError) {
      return errorResponse('Failed to fetch telemetry', 500);
    }

    // Drive boundary detection
    const drives: Array<{
      vehicle_id: string;
      sync_session_id: string;
      started_at: string;
      ended_at: string;
      duration_seconds: number;
      peak_metrics: Record<string, number>;
      summary_metrics: Record<string, number>;
      has_anomaly: boolean;
    }> = [];

    if (telemetry && telemetry.length > 0) {
      let driveStart = 0;

      for (let i = 1; i <= telemetry.length; i++) {
        const isLast = i === telemetry.length;
        const gap = isLast ? DRIVE_GAP_MS + 1 :
          new Date(telemetry[i].timestamp).getTime() -
          new Date(telemetry[i - 1].timestamp).getTime();

        if (gap > DRIVE_GAP_MS || isLast) {
          const driveTelemetry = telemetry.slice(driveStart, isLast ? i : i);
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
                  peakMetrics[key] = Math.max(peakMetrics[key] ?? 0, val);
                  sumMetrics[key] = (sumMetrics[key] ?? 0) + val;
                  countMetrics[key] = (countMetrics[key] ?? 0) + 1;
                }
              }
            }

            const avgMetrics: Record<string, number> = {};
            for (const key of Object.keys(sumMetrics)) {
              avgMetrics[key] = Math.round((sumMetrics[key] / countMetrics[key]) * 100) / 100;
            }

            drives.push({
              vehicle_id: session.vehicle_id,
              sync_session_id: session_id,
              started_at: startedAt,
              ended_at: endedAt,
              duration_seconds: durationSeconds,
              peak_metrics: peakMetrics,
              summary_metrics: avgMetrics,
              has_anomaly: false,
            });
          }
          driveStart = i;
        }
      }
    }

    // Insert drives
    let drivesCreated = 0;
    if (drives.length > 0) {
      const { error: drivesError } = await adminClient
        .from('drives')
        .insert(drives);

      if (drivesError) {
        console.error('drives insert error:', drivesError);
      } else {
        drivesCreated = drives.length;
      }
    }

    // Count new DTCs
    const { count: dtcsAdded } = await adminClient
      .from('dtcs')
      .select('id', { count: 'exact', head: true })
      .eq('sync_session_id', session_id);

    // Mark session completed
    await adminClient
      .from('sync_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    // Update vehicle last_sync_at
    await adminClient
      .from('vehicles')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', session.vehicle_id);

    // Update device last_sync_at and last_seen_at
    await adminClient
      .from('devices')
      .update({
        last_sync_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', device_id);

    // Notify AI agent via pg_notify
    await adminClient.rpc('notify_agent', {
      p_session_id: session_id,
      p_vehicle_id: session.vehicle_id,
    }).then(() => {}).catch((e: unknown) => {
      // Non-fatal — agent will poll as fallback
      console.warn('notify_agent failed:', e);
    });

    return okResponse({
      drives_created: drivesCreated,
      dtcs_added: dtcsAdded ?? 0,
    });

  } catch (err) {
    console.error('device_sync_complete error:', err);
    return errorResponse('Internal server error', 500);
  }
});

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
