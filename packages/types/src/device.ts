// Device domain — pairing request/response contracts for the `pair_device`
// Edge Function (see docs/07_Sync_Architecture.md § pair_device).
//
// The function takes `{ device_secret }` (user JWT in the Authorization header)
// and returns `{ device_id }` on success, or a flat `{ error }` body with an
// HTTP status of 400 / 401 / 404 / 409 / 500. These schemas validate both
// directions at the boundary; the discriminated `PairDeviceError` lets the UI
// branch on the failure without re-parsing strings.
import { z } from 'zod';

/**
 * A device's pairing secret — the value encoded in the device-label QR and the
 * value a user types in the manual-entry fallback. Confirmed (2026-06-21) to be
 * the raw secret string with no wrapping (URL/JSON/prefix); the app's QR parse
 * seam trims and hands the scanned text straight to this schema.
 */
export const deviceSecretSchema = z.string().trim().min(1);
export type DeviceSecret = z.infer<typeof deviceSecretSchema>;

/** Request body for the `pair_device` Edge Function. */
export const pairDeviceRequestSchema = z.object({
  device_secret: deviceSecretSchema,
});
export type PairDeviceRequest = z.infer<typeof pairDeviceRequestSchema>;

/** 200 response body from `pair_device`. */
export const pairDeviceSuccessSchema = z.object({
  device_id: z.string().uuid(),
});
export type PairDeviceSuccess = z.infer<typeof pairDeviceSuccessSchema>;

/**
 * Wire error body — `pair_device` returns a flat `{ error: <message> }` on every
 * non-2xx response (see supabase/functions/_shared/errors.ts).
 */
export const pairDeviceErrorBodySchema = z.object({
  error: z.string(),
});
export type PairDeviceErrorBody = z.infer<typeof pairDeviceErrorBodySchema>;

/**
 * Mapped pairing failure, keyed on the HTTP `status` the Edge Function returned.
 * `'network'` is the synthetic status for transport failures/timeouts that never
 * reached the function. Each variant carries a stable `code` the UI maps to a
 * localized message and recovery affordance (retry vs. manual entry vs. dead-end).
 */
export const pairDeviceErrorSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(400), code: z.literal('invalid_request'), message: z.string() }),
  z.object({ status: z.literal(401), code: z.literal('unauthorized'), message: z.string() }),
  z.object({ status: z.literal(404), code: z.literal('not_found'), message: z.string() }),
  z.object({ status: z.literal(409), code: z.literal('already_claimed'), message: z.string() }),
  z.object({ status: z.literal(500), code: z.literal('server_error'), message: z.string() }),
  z.object({ status: z.literal('network'), code: z.literal('network'), message: z.string() }),
]);
export type PairDeviceError = z.infer<typeof pairDeviceErrorSchema>;
export type PairDeviceErrorStatus = PairDeviceError['status'];

/**
 * Discriminated outcome of a pairing attempt. `ok` separates success from
 * failure; on failure, `status` further discriminates the variant. The typed
 * client (`pairDevice`) always resolves to one of these — it never throws.
 */
export type PairDeviceResult = ({ ok: true } & PairDeviceSuccess) | ({ ok: false } & PairDeviceError);
