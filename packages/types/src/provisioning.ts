// Wi-Fi provisioning domain — the boundary contracts and result-mapping for
// handing a user's hotspot credentials to a Caeorta device over its local SoftAP
// using the standard ESP-IDF `wifi_provisioning` protocol
// (via @orbital-systems/react-native-esp-idf-provisioning).
//
// IMPORTANT — firmware-gated. As of this writing NO device speaks this protocol
// yet (the V1 prototype has Wi-Fi creds hardcoded + flashed). This module is
// built to the published ESP-IDF standard so that when firmware adopts the same
// standard both sides meet. The string heuristics in the error/status mappers
// below are best-effort buckets over the ESP SDK's native responses; the exact
// status/error strings get pinned during real-device integration. See
// `docs/07_Sync_Architecture.md` and the PR's "Carries forward" section.
//
// This file intentionally has NO dependency on the native provisioning library —
// it holds only the pure, Zod-validated boundary schemas and the result-mapping
// logic, so it is unit-testable in plain Node (vitest) without a device or a
// native build. The mobile orchestrator (`apps/mobile/src/lib/provisioning.ts`)
// imports the native module and these mappers and wires them together.
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Native boundary schemas — validate the untyped JS that crosses the native
// bridge before we trust it. Mirrors the library's `ESPStatusResponse` and
// `ESPWifiList` shapes (kept loose: `auth` is the numeric `ESPWifiAuthMode`,
// re-declared as a number so this package needn't import the native enum).
// ---------------------------------------------------------------------------

/** A single network the device reports from `scanWifiList()`. */
export const espWifiListItemSchema = z.object({
  ssid: z.string(),
  rssi: z.number(),
  auth: z.number(), // ESPWifiAuthMode (0–7); kept numeric to avoid native coupling
  bssid: z.string().optional(),
  channel: z.number().optional(),
});
export type EspWifiListItem = z.infer<typeof espWifiListItemSchema>;

export const espWifiListSchema = z.array(espWifiListItemSchema);

/** The device's response to `provision(ssid, passphrase)`. */
export const espStatusResponseSchema = z.object({
  status: z.string(),
});
export type EspStatusResponse = z.infer<typeof espStatusResponseSchema>;

/**
 * The user's hotspot credentials, validated at the UI ↔ provisioning boundary
 * before they are handed to the device. SSID is bounded to the 802.11 limit (1–32
 * octets); the passphrase is bounded to the WPA limit (≤63 chars) and allowed to
 * be empty for an open network. We don't otherwise constrain charset — the device
 * is the authority on what it accepts.
 */
export const wifiCredentialsSchema = z.object({
  ssid: z.string().min(1).max(32),
  password: z.string().max(63),
});
export type WifiCredentials = z.infer<typeof wifiCredentialsSchema>;

// ---------------------------------------------------------------------------
// Provisioning outcome — the discriminated result the orchestrator resolves to.
// It never throws; every failure path collapses onto one of these `reason`s so
// the UI can branch on `reason` alone and map it to a localized affordance.
//
//   success            — device accepted the creds and reported a good connect
//   device-not-found   — couldn't find/reach the device on its SoftAP
//   wrong-pop          — session handshake failed (proof-of-possession/security)
//   wifi-auth-failed   — device reached the hotspot but the creds were rejected
//   timeout            — a step exceeded its budget (we aborted)
//   network            — transport/unknown comms failure
// ---------------------------------------------------------------------------

export const provisioningResultSchema = z.discriminatedUnion('reason', [
  z.object({ reason: z.literal('success'), deviceName: z.string() }),
  z.object({ reason: z.literal('device-not-found'), message: z.string() }),
  z.object({ reason: z.literal('wrong-pop'), message: z.string() }),
  z.object({ reason: z.literal('wifi-auth-failed'), message: z.string() }),
  z.object({ reason: z.literal('timeout'), message: z.string() }),
  z.object({ reason: z.literal('network'), message: z.string() }),
]);
export type ProvisioningResult = z.infer<typeof provisioningResultSchema>;
export type ProvisioningReason = ProvisioningResult['reason'];

/** The step a failure happened in — drives how a thrown native error is bucketed. */
export type ProvisioningPhase = 'search' | 'connect' | 'provision';

// ---------------------------------------------------------------------------
// Result mapping — pure functions, the unit-tested core of the boundary.
// ---------------------------------------------------------------------------

/** Normalized view of whatever the native bridge throws (Error, string, code object). */
export interface NormalizedProvisioningError {
  message: string;
  /** Lowercased `code`/`name` if the native error carried one, else null. */
  code: string | null;
  /** True when the failure was our own AbortController/timeout firing. */
  aborted: boolean;
}

/** Coerce an unknown thrown value into a {@link NormalizedProvisioningError}. */
export function normalizeProvisioningError(err: unknown): NormalizedProvisioningError {
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown; name?: unknown };
    const message = typeof e.message === 'string' ? e.message : String(err);
    const rawCode = typeof e.code === 'string' ? e.code : typeof e.name === 'string' ? e.name : null;
    const code = rawCode ? rawCode.toLowerCase() : null;
    const aborted = code === 'aborterror' || /\babort(ed)?\b/i.test(message);
    return { message, code, aborted };
  }
  const message = typeof err === 'string' ? err : 'Unknown provisioning error';
  return { message, code: null, aborted: /\babort(ed)?\b/i.test(message) };
}

const matches = (n: NormalizedProvisioningError, re: RegExp): boolean =>
  re.test(n.message) || (n.code !== null && re.test(n.code));

/**
 * Interpret the device's `provision()` status string. Reaching a status at all
 * means the session and transport were fine, so the only thing that can have
 * gone wrong is the hotspot credentials — hence every non-success bucket is
 * `wifi-auth-failed`. (Heuristic; exact strings pinned at integration.)
 */
export function mapProvisionStatus(
  status: string,
  deviceName: string,
): ProvisioningResult {
  if (/\b(success|connected|applied|provisioned)\b/i.test(status)) {
    return { reason: 'success', deviceName };
  }
  return { reason: 'wifi-auth-failed', message: `Device reported: ${status}` };
}

/**
 * Bucket a thrown native error into a {@link ProvisioningResult}, given the step
 * it came from. Timeouts win first; otherwise the phase plus message/code
 * heuristics pick the closest reason. Anything genuinely unattributable falls
 * back to `network` (a comms-level catch-all) so the function is total.
 */
export function mapProvisioningError(
  err: unknown,
  phase: ProvisioningPhase,
): ProvisioningResult {
  const n = normalizeProvisioningError(err);
  if (n.aborted || matches(n, /\btim(e|ed)?\s*out\b/)) {
    return { reason: 'timeout', message: n.message };
  }

  switch (phase) {
    case 'search':
      // Failure while finding the device on its SoftAP — almost always "not there".
      if (matches(n, /\b(network|connection|socket|unreachable|transport)\b/)) {
        return { reason: 'network', message: n.message };
      }
      return { reason: 'device-not-found', message: n.message };

    case 'connect':
      if (matches(n, /\b(pop|proof|security|session|handshake|unauthor)/)) {
        return { reason: 'wrong-pop', message: n.message };
      }
      if (matches(n, /\b(not\s*found|no\s*device|unreachable|no\s*peripheral)\b/)) {
        return { reason: 'device-not-found', message: n.message };
      }
      return { reason: 'network', message: n.message };

    case 'provision':
      if (matches(n, /\b(auth|password|passphrase|invalid|incorrect|wrong|ssid|not\s*found)\b/)) {
        return { reason: 'wifi-auth-failed', message: n.message };
      }
      return { reason: 'network', message: n.message };
  }
}
