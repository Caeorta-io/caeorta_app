import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const { device_secret } = await req.json();
    if (!device_secret) {
      return errorResponse('device_secret is required', 400);
    }

    // User-scoped client to get the caller's identity
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Service role client for privileged operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find the device by secret
    const { data: device, error: deviceError } = await adminClient
      .from('devices')
      .select('id, status, claimed_by_user_id')
      .eq('device_secret', device_secret)
      .single();

    if (deviceError || !device) {
      return errorResponse('Device not found', 404);
    }

    if (device.status !== 'unclaimed') {
      return errorResponse('Device is already claimed', 409);
    }

    // Atomically claim the device
    const { error: updateError } = await adminClient
      .from('devices')
      .update({
        claimed_by_user_id: user.id,
        claimed_at: new Date().toISOString(),
        status: 'active',
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', device.id)
      .eq('status', 'unclaimed'); // guard against race condition

    if (updateError) {
      return errorResponse('Failed to claim device', 500);
    }

    // Write to audit log
    await adminClient.from('audit_log').insert({
      actor_user_id: user.id,
      action: 'device.claimed',
      target_type: 'device',
      target_id: device.id,
      metadata: { device_secret_prefix: device_secret.slice(0, 4) + '****' },
    });

    return okResponse({ device_id: device.id });

  } catch (err) {
    console.error('pair_device error:', err);
    return errorResponse('Internal server error', 500);
  }
});
