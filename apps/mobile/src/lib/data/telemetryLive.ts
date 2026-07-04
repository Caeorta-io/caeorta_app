/**
 * The app's FIRST real Edge Function read: `get_drive_telemetry` for the drive-detail
 * telemetry charts. This is the live half of the `driveTelemetry` capability, kept in
 * its own module (imports the Supabase client for the bearer token) so the data seam in
 * `./source.ts` stays Node-pure — `source.ts` reaches this via a lazy `import()` only on
 * the live branch (see the block comment there).
 *
 * Contract: no `metric` param → the function returns EVERY channel per point in one
 * round trip, downsampled server-side to <= 300 points total. We split the channels
 * client-side (`splitTelemetryChannels`), so this is one request for all three charts.
 *
 * This is a READ: unlike `pairDevice` (a never-throws orchestrator over a write), a
 * non-2xx or transport failure THROWS {@link TelemetryFetchError} carrying the HTTP
 * status (or synthetic `'network'`). The `useDriveTelemetry` hook's error state surfaces
 * it and the screen maps the status to per-chart copy — same status granularity as the
 * pairing flow, but thrown rather than returned.
 */
import { supabase } from '@/lib/supabase';
import { parseDriveTelemetry, TelemetryFetchError, type DriveTelemetry } from '@/lib/telemetry';

// Inlined at build time, same as the Supabase client (see lib/supabase.ts / pairing.ts).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Time budget for a single telemetry read before we abort and treat it as a network
 * failure (the charts then show an inline retry). One drive is <= 300 downsampled rows,
 * so this is generous.
 */
const TELEMETRY_TIMEOUT_MS = 15_000;

/**
 * Fetch a drive's full (all-channel) telemetry from `get_drive_telemetry`.
 *
 * Throws {@link TelemetryFetchError} with:
 *   • `401` — no active session, or the function rejected the token.
 *   • `403` — the drive isn't the caller's (function's ownership check).
 *   • `404` — no such drive.
 *   • `500` — server fault, or a malformed 200 body.
 *   • `'network'` — the request never reached the server (offline / DNS / timeout).
 */
export async function fetchDriveTelemetryLive(driveId: string): Promise<DriveTelemetry> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new TelemetryFetchError(401, 'No active session');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `${SUPABASE_URL}/functions/v1/get_drive_telemetry?drive_id=${encodeURIComponent(driveId)}`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      },
    );
  } catch {
    // No connectivity, DNS failure, or the abort timer firing — indistinguishable, and
    // all recoverable by retrying.
    throw new TelemetryFetchError('network', 'Request failed to reach the server');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // Pull the function's flat `{ error }` message for logging; the UI keys off status.
    const body: unknown = await res.json().catch(() => null);
    const message =
      body !== null && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new TelemetryFetchError(res.status, message);
  }

  const body: unknown = await res.json().catch(() => null);
  return parseDriveTelemetry(body); // throws a 500 TelemetryFetchError on a malformed body
}
