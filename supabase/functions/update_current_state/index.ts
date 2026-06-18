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

    const { vehicle_id, metrics } = await req.json();
    if (!vehicle_id || !metrics) {
      return errorResponse('vehicle_id and metrics are required', 400);
    }

    // Verify device JWT
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

    // Verify vehicle belongs to this device
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .select('id, device_id')
      .eq('id', vehicle_id)
      .eq('device_id', device_id)
      .single();

    if (vehicleError || !vehicle) {
      return errorResponse('Vehicle not found or not paired to this device', 403);
    }

    // Upsert current_state — one row per vehicle, always overwritten
    const { error: upsertError } = await adminClient
      .from('current_state')
      .upsert({
        vehicle_id,
        latest_metrics: metrics,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'vehicle_id' });

    if (upsertError) {
      console.error('upsert error:', upsertError);
      return errorResponse('Failed to update current state', 500);
    }

    // Update device last_seen_at
    await adminClient
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', device_id);

    return okResponse({ success: true });

  } catch (err) {
    console.error('update_current_state error:', err);
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
