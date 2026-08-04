import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/errors.ts';

const ECU_TYPES = ['oem', 'haltech', 'aem', 'motec', 'link', 'other'] as const;
const CURRENT_YEAR = new Date().getFullYear();

function createdResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validationError(fieldErrors: Record<string, string[]>): Response {
  return new Response(
    JSON.stringify({ error: 'validation_error', fieldErrors }),
    { status: 422, headers: { 'Content-Type': 'application/json' } },
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

    const {
      device_id,
      make,
      model,
      year,
      nickname,
      ecu_type,
      modifications,
    } = await req.json();

    // Authenticate caller
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

    // 1. device_id valid UUID and exists
    if (!device_id || typeof device_id !== 'string') {
      return errorResponse('device_not_claimed', 400);
    }

    const { data: device, error: deviceError } = await adminClient
      .from('devices')
      .select('id, claimed_by_user_id, status')
      .eq('id', device_id)
      .single();

    if (deviceError || !device) {
      return errorResponse('device_not_claimed', 400);
    }

    // 2. caller owns the device
    if (device.claimed_by_user_id !== user.id) {
      return errorResponse('not_device_owner', 403);
    }

    // 3. device is active
    if (device.status !== 'active') {
      return errorResponse('device_not_active', 400);
    }

    // 4. no existing vehicle for this device
    const { data: existing } = await adminClient
      .from('vehicles')
      .select('id')
      .eq('device_id', device_id)
      .single();

    if (existing) {
      return errorResponse('duplicate_vehicle', 409);
    }

    // 5. field validation -> validation_error (422) with fieldErrors
    const fieldErrors: Record<string, string[]> = {};

    if (typeof make !== 'string' || make.trim().length === 0) {
      fieldErrors.make = ['Make is required'];
    } else if (make.length > 100) {
      fieldErrors.make = ['Make must be 100 characters or fewer'];
    }

    if (typeof model !== 'string' || model.trim().length === 0) {
      fieldErrors.model = ['Model is required'];
    } else if (model.length > 100) {
      fieldErrors.model = ['Model must be 100 characters or fewer'];
    }

    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1980 || yearNum > CURRENT_YEAR + 1) {
      fieldErrors.year = ['Year is out of range'];
    }

    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      fieldErrors.nickname = ['Nickname is required'];
    } else if (nickname.length > 60) {
      fieldErrors.nickname = ['Nickname must be 60 characters or fewer'];
    }

    // ecu_type: required, must be one of the canonical set. Never default.
    if (typeof ecu_type !== 'string' || !ECU_TYPES.includes(ecu_type as typeof ECU_TYPES[number])) {
      fieldErrors.ecu_type = ['ecu_type must be one of: ' + ECU_TYPES.join(', ')];
    }

    if (modifications !== undefined && modifications !== null) {
      if (typeof modifications !== 'string') {
        fieldErrors.modifications = ['Modifications must be text'];
      } else if (modifications.length > 500) {
        fieldErrors.modifications = ['Modifications must be 500 characters or fewer'];
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return validationError(fieldErrors);
    }

    // Encode modifications: bare string -> {"notes": "..."} jsonb, or {} when blank
    const modificationsJsonb = (modifications && modifications.trim().length > 0)
      ? { notes: modifications.trim() }
      : {};

    // Ensure user exists in public.users
    await adminClient
      .from('users')
      .upsert({ id: user.id, locale: 'en' }, { onConflict: 'id' });

    // Insert with RETURNING * equivalent — select('*')
    const { data: vehicle, error: insertError } = await adminClient
      .from('vehicles')
      .insert({
        owner_user_id: user.id,
        device_id,
        make: make.trim(),
        model: model.trim(),
        year: yearNum,
        nickname: nickname.trim(),
        ecu_type,
        modifications: modificationsJsonb,
      })
      .select('*')
      .single();

    if (insertError || !vehicle) {
      console.error('vehicle insert error:', insertError);
      return errorResponse('Internal server error', 500);
    }

    // Audit log, consistent with pair_device's device.claimed
    await adminClient.from('audit_log').insert({
      actor_user_id: user.id,
      action: 'vehicle.created',
      target_type: 'vehicle',
      target_id: vehicle.id,
      metadata: { make, model, year: yearNum, device_id, ecu_type },
    });

    return createdResponse({ vehicle });

  } catch (err) {
    console.error('create_vehicle error:', err);
    return errorResponse('Internal server error', 500);
  }
});
