import {
  deviceSecretSchema,
  pairDeviceErrorBodySchema,
  pairDeviceSuccessSchema,
  type PairDeviceResult,
} from '@caeorta/types';

import { supabase } from '@/lib/supabase';

// Inlined at build time, same as the Supabase client (see lib/supabase.ts).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Time budget for a single `pair_device` call before we abort and treat it as a
 * network failure (which the UI surfaces with a retry affordance). The function
 * is only a couple of Postgres round-trips, so this is deliberately generous.
 */
const PAIR_DEVICE_TIMEOUT_MS = 15_000;

/**
 * QR parse seam. The device label encodes the **raw** `device_secret` with no
 * wrapping (URL/JSON/prefix) — confirmed 2026-06-21 — so today this is just a
 * trim. If hardware ever moves to a wrapped payload, this is the single place to
 * change: both the scanner and the manual-entry screen funnel their input
 * through `pairDevice`, and the scanner runs its scanned text through here first.
 */
export function parseDeviceQr(raw: string): string {
  return raw.trim();
}

/**
 * Claims a device for the current user via the `pair_device` Edge Function.
 *
 * Resolves to a discriminated {@link PairDeviceResult} — it never throws. The
 * auth header is the current session's access token; transport failures and the
 * timeout collapse to a synthetic `'network'` status so the UI can offer a retry.
 */
export async function pairDevice(rawSecret: string): Promise<PairDeviceResult> {
  // Validate at the boundary before spending a network round-trip.
  const parsed = deviceSecretSchema.safeParse(rawSecret);
  if (!parsed.success) {
    return { ok: false, status: 400, code: 'invalid_request', message: 'Empty device secret' };
  }
  const device_secret = parsed.data;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { ok: false, status: 401, code: 'unauthorized', message: 'No active session' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAIR_DEVICE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/pair_device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ device_secret }),
      signal: controller.signal,
    });
  } catch {
    // No connectivity, DNS failure, or the abort timer firing — all indistinguishable
    // from the app's point of view, and all recoverable by retrying.
    return { ok: false, status: 'network', code: 'network', message: 'Request failed to reach the server' };
  } finally {
    clearTimeout(timeout);
  }

  if (res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const success = pairDeviceSuccessSchema.safeParse(body);
    if (!success.success) {
      // 200 but an unexpected shape — treat as a server fault, not a success.
      return { ok: false, status: 500, code: 'server_error', message: 'Malformed success response' };
    }
    return { ok: true, device_id: success.data.device_id };
  }

  // Non-2xx: pull the flat `{ error }` message for logging; the UI keys off status/code.
  const errorBody: unknown = await res.json().catch(() => null);
  const errorParse = pairDeviceErrorBodySchema.safeParse(errorBody);
  const message = errorParse.success ? errorParse.data.error : `HTTP ${res.status}`;

  switch (res.status) {
    case 400:
      return { ok: false, status: 400, code: 'invalid_request', message };
    case 401:
      return { ok: false, status: 401, code: 'unauthorized', message };
    case 404:
      return { ok: false, status: 404, code: 'not_found', message };
    case 409:
      return { ok: false, status: 409, code: 'already_claimed', message };
    default:
      // 500 and any other unexpected status collapse to a generic server error.
      return { ok: false, status: 500, code: 'server_error', message };
  }
}
