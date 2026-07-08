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

    const {
      device_id,
      make,
      model,
      year,
      nickname,
      ecu_type,
      modifications,
    } = await req.json();

    if (!device_id || !make || !model || !year) {
      return errorResponse('device_id, make, model and year are required', 400);
    }

    // Verify caller is authenticated
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the device exists and belongs to this user
    const { data: device, error: deviceError } = await adminClient
      .from('devices')
      .select('id, claimed_by_user_id, status')
      .eq('id', device_id)
      .single();

    if (deviceError || !device) {
      return errorResponse('Device not found', 404);
    }

    if (device.claimed_by_user_id !== user.id) {
      return errorResponse('Device does not belong to you', 403);
    }

    if (device.status !== 'active') {
      return errorResponse('Device is not active', 403);
    }

    // Check if device already has a vehicle
    const { data: existing } = await adminClient
      .from('vehicles')
      .select('id')
      .eq('device_id', device_id)
      .single();

    if (existing) {
      return errorResponse('Device already has a vehicle registered', 409);
    }

    // Ensure user exists in public.users (created on first auth)
    await adminClient
      .from('users')
      .upsert({ id: user.id, locale: 'en' }, { onConflict: 'id' });

    // Create the vehicle
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .insert({
        owner_user_id: user.id,
        device_id,
        make,
        model,
        year: Number(year),
        nickname: nickname ?? `${make} ${model}`,
        ecu_type: ecu_type ?? 'oem',
        modifications: modifications ?? {},
      })
      .select('id, make, model, year, nickname, device_id, created_at')
      .single();

    if (vehicleError || !vehicle) {
      console.error('vehicle insert error:', vehicleError);
      return errorResponse('Failed to create vehicle', 500);
    }

    // Write audit log
    await adminClient.from('audit_log').insert({
      actor_user_id: user.id,
      action: 'vehicle.created',
      target_type: 'vehicle',
      target_id: vehicle.id,
      metadata: { make, model, year, device_id },
    });

    return okResponse({ vehicle });

  } catch (err) {
    console.error('create_vehicle error:', err);
    return errorResponse('Internal server error', 500);
  }
});
