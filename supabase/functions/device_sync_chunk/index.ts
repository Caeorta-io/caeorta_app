import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const { session_id, sequence_number, rows, dtcs } = await req.json();

    if (!session_id || sequence_number === undefined) {
      return errorResponse('session_id and sequence_number are required', 400);
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
      .select('id, device_id, vehicle_id, status, row_count, bytes_uploaded')
      .eq('id', session_id)
      .eq('device_id', device_id)
      .single();

    if (sessionError || !session) {
      return errorResponse('Sync session not found', 404);
    }

    if (session.status === 'completed' || session.status === 'failed') {
      return errorResponse('Sync session already ended', 409);
    }

    // Insert telemetry rows in batch
    const telemetryRows = (rows ?? []).map((row: Record<string, unknown>) => ({
      vehicle_id: session.vehicle_id,
      sync_session_id: session_id,
      timestamp: row.timestamp,
      metrics: row.metrics,
    }));

    if (telemetryRows.length > 0) {
      const { error: telemetryError } = await adminClient
        .from('telemetry')
        .insert(telemetryRows);

      if (telemetryError) {
        console.error('telemetry insert error:', telemetryError);
        return errorResponse('Failed to insert telemetry', 500);
      }
    }

    // Insert new DTCs (deduplicate against active DTCs)
    const dtcRows = dtcs ?? [];
    for (const dtc of dtcRows) {
      const { data: existing } = await adminClient
        .from('dtcs')
        .select('id')
        .eq('vehicle_id', session.vehicle_id)
        .eq('code', dtc.code)
        .eq('is_active', true)
        .single();

      if (!existing) {
        await adminClient.from('dtcs').insert({
          vehicle_id: session.vehicle_id,
          sync_session_id: session_id,
          code: dtc.code,
          description: dtc.description ?? null,
          severity_raw: dtc.severity_raw ?? null,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          is_active: true,
        });
      } else {
        await adminClient
          .from('dtcs')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    }

    // Estimate bytes uploaded
    const chunkBytes = new TextEncoder().encode(JSON.stringify(rows ?? [])).length;

    // Update sync session
    await adminClient
      .from('sync_sessions')
      .update({
        status: 'streaming',
        row_count: (session.row_count ?? 0) + telemetryRows.length,
        bytes_uploaded: (session.bytes_uploaded ?? 0) + chunkBytes,
      })
      .eq('id', session_id);

    return okResponse({
      acked_sequence: sequence_number,
      next_expected: sequence_number + 1,
    });

  } catch (err) {
    console.error('device_sync_chunk error:', err);
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
