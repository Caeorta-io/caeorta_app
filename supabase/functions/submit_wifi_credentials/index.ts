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

    const { device_id, ssid, password } = await req.json();
    if (!device_id || !ssid || !password) {
      return errorResponse('device_id, ssid and password are required', 400);
    }

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

    // Confirm user owns the device
    const { data: device, error: deviceError } = await adminClient
      .from('devices')
      .select('id, claimed_by_user_id')
      .eq('id', device_id)
      .single();

    if (deviceError || !device) {
      return errorResponse('Device not found', 404);
    }

    if (device.claimed_by_user_id !== user.id) {
      return errorResponse('You do not own this device', 403);
    }

    // Read encryption key from Vault
    const { data: secret, error: vaultError } = await adminClient
      .from('vault.decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', 'wifi_credential_encryption_key')
      .single();

    if (vaultError || !secret) {
      console.error('Vault error:', vaultError);
      return errorResponse('Failed to retrieve encryption key', 500);
    }

    const encryptionKey = secret.decrypted_secret;
    const encrypted = await encryptPassword(password, encryptionKey);

    const { error: upsertError } = await adminClient
      .from('device_wifi_credentials')
      .upsert(
        {
          device_id,
          ssid,
          encrypted_password: encrypted,
          priority: 0,
          added_at: new Date().toISOString(),
        },
        { onConflict: 'device_id,ssid' },
      );

    if (upsertError) {
      console.error('upsert error:', upsertError);
      return errorResponse('Failed to save credentials', 500);
    }

    return okResponse({ success: true });

  } catch (err) {
    console.error('submit_wifi_credentials error:', err);
    return errorResponse('Internal server error', 500);
  }
});

async function encryptPassword(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded,
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
