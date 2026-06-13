import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { errorResponse, okResponse } from '../_shared/errors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { device_id, device_secret } = await req.json();

    if (!device_id || !device_secret) {
      return errorResponse('device_id and device_secret are required', 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: device, error } = await supabase
      .from('devices')
      .select('id, status, device_secret')
      .eq('id', device_id)
      .single();

    if (error || !device) {
      return errorResponse('Device not found', 401);
    }

    if (device.device_secret !== device_secret) {
      return errorResponse('Invalid device secret', 401);
    }

    if (device.status !== 'active') {
      return errorResponse('Device is not active', 403);
    }

    await supabase
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', device_id);

    // Mint JWT using Web Crypto — no external library needed
    const signingSecret = Deno.env.get('DEVICE_JWT_SIGNING_SECRET')!;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 15 * 60;

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { device_id, iat: now, exp: expiresAt };

    const encode = (obj: unknown) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const headerB64 = encode(header);
    const payloadB64 = encode(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signingInput),
    );

    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const jwt = `${signingInput}.${sigB64}`;

    return okResponse({ jwt, expires_at: new Date(expiresAt * 1000).toISOString() });

  } catch (err) {
    console.error('mint_device_token error:', err);
    return errorResponse('Internal server error', 500);
  }
});
