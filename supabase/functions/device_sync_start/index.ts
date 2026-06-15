import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify device JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const { vehicle_id } = await req.json();
    if (!vehicle_id) {
      return errorResponse('vehicle_id is required', 400);
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

    // Create sync session
    const { data: session, error: sessionError } = await adminClient
      .from('sync_sessions')
      .insert({
        device_id,
        vehicle_id,
        started_at: new Date().toISOString(),
        status: 'pending',
        bytes_uploaded: 0,
        row_count: 0,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('session error:', sessionError);
      return errorResponse('Failed to create sync session', 500);
    }

    // Update device last_seen_at
    await adminClient
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', device_id);

    return okResponse({ session_id: session.id });

  } catch (err) {
    console.error('device_sync_start error:', err);
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
