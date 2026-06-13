import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Device JWT auth — extract device_id from the token claim
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const { current_firmware_version } = await req.json();
    if (!current_firmware_version) {
      return errorResponse('current_firmware_version is required', 400);
    }

    // Verify device JWT and extract device_id
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

    // Get the target firmware version for this device
    const { data: device, error: deviceError } = await adminClient
      .from('devices')
      .select('id, target_firmware_version, firmware_version')
      .eq('id', device_id)
      .single();

    if (deviceError || !device) {
      return errorResponse('Device not found', 404);
    }

    // Update the device's reported firmware version
    await adminClient
      .from('devices')
      .update({ firmware_version: current_firmware_version })
      .eq('id', device_id);

    const target = device.target_firmware_version;

    // No target set — device is up to date
    if (!target || target === current_firmware_version) {
      return okResponse({ update_available: false });
    }

    // Look up the target version binary
    const { data: firmware, error: firmwareError } = await adminClient
      .from('firmware_versions')
      .select('version, binary_url, checksum, is_active')
      .eq('version', target)
      .single();

    if (firmwareError || !firmware || !firmware.is_active) {
      // Target version not available or retired — don't force update
      return okResponse({ update_available: false });
    }

    return okResponse({
      update_available: true,
      target_version: firmware.version,
      binary_url: firmware.binary_url,
      checksum: firmware.checksum,
    });

  } catch (err) {
    console.error('ota_check error:', err);
    return errorResponse('Internal server error', 500);
  }
});

// Verify a device JWT and return the device_id claim, or null if invalid
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

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      new TextEncoder().encode(data),
    );

    if (!valid) return null;

    const payload = JSON.parse(atob(parts[1]));

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload.device_id ?? null;
  } catch {
    return null;
  }
}
