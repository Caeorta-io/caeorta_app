import { createVehicleInputSchema } from '@caeorta/types';
import type { Tables } from '@caeorta/supabase';

import { createVehicle as createVehicleViaSource } from '@/lib/data/source';

/**
 * Add-vehicle orchestrator — the App-track half of the `create_vehicle` contract
 * (docs/create_vehicle_contract.md). Mirrors `lib/pairing.ts`: it validates at the
 * boundary, calls the data seam, and resolves to a discriminated result. It NEVER
 * throws — every failure path collapses onto one {@link VehicleCreateError} the UI
 * branches on by `code`.
 *
 * E2E is gated on the Platform-side Edge Function landing (carried like Wi-Fi
 * provisioning): today the seam serves a mock that always succeeds, so the device /
 * duplicate error variants are reachable only once the live `fetch` is wired in
 * `lib/data/source.ts`. The mapping below is built to that contract now so the
 * 'live' flip is a source.ts change, not an orchestrator change.
 */

/**
 * Mapped create-vehicle failure. The first four `code`s mirror the Edge Function's
 * application-level checks (see the contract doc); `validation_error` is produced
 * locally by the Zod parse before any call; `network` is the catch-all for transport
 * failures and any unrecognised thrown error so the function stays total.
 */
export type VehicleCreateError =
  | { code: 'not_device_owner' }
  | { code: 'device_not_claimed' }
  | { code: 'device_not_active' }
  | { code: 'duplicate_vehicle' }
  | { code: 'validation_error'; fieldErrors: Record<string, string[]> }
  | { code: 'network' };

/** Discriminated outcome of a create-vehicle attempt; `createVehicle` never throws. */
export type VehicleCreateResult =
  | { ok: true; vehicle: Tables<'vehicles'> }
  | { ok: false; error: VehicleCreateError };

/**
 * The Edge Function `error` codes that map straight onto a {@link VehicleCreateError}
 * variant. When the live seam is wired, `lib/data/source.ts` throws an error carrying
 * one of these as a `code`; the mapper below recognises it. `validation_error` and
 * `network` are deliberately excluded — they're handled by the parse step and the
 * fallback respectively, not by passthrough.
 */
const PASSTHROUGH_ERROR_CODES = [
  'not_device_owner',
  'device_not_claimed',
  'device_not_active',
  'duplicate_vehicle',
] as const;

type PassthroughErrorCode = (typeof PASSTHROUGH_ERROR_CODES)[number];

function isPassthroughCode(value: unknown): value is PassthroughErrorCode {
  return (
    typeof value === 'string' &&
    (PASSTHROUGH_ERROR_CODES as readonly string[]).includes(value)
  );
}

/**
 * Bucket a thrown value from the data seam into a {@link VehicleCreateError}. An
 * error carrying a recognised `code` (the live path will set this from the HTTP
 * `{ error }` body) passes through; everything else — transport failure, timeout,
 * the mock's defensive parse, an unknown server fault — collapses to `network`, so
 * the mapper is total.
 */
function mapThrownError(err: unknown): VehicleCreateError {
  if (err && typeof err === 'object' && 'code' in err && isPassthroughCode(err.code)) {
    return { code: err.code };
  }
  return { code: 'network' };
}

/**
 * Validates `rawInput`, creates the vehicle via the data seam, and resolves to a
 * {@link VehicleCreateResult}. Never throws.
 *
 *   1. Parse with the shared Zod schema — on failure, `validation_error` carrying
 *      Zod's per-field messages (the form keys inline errors off these).
 *   2. Call the data-source `createVehicle` (mock today, Edge Function once live).
 *   3. Map any thrown error onto the union — recognised codes pass through, the rest
 *      become `network`.
 */
export async function createVehicle(rawInput: unknown): Promise<VehicleCreateResult> {
  const parsed = createVehicleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    // Zod's fieldErrors values are `string[] | undefined`; drop the undefined holes
    // so the UI gets a clean `Record<string, string[]>`.
    const flattened = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string[]> = {};
    for (const [field, messages] of Object.entries(flattened)) {
      if (messages && messages.length > 0) fieldErrors[field] = messages;
    }
    return { ok: false, error: { code: 'validation_error', fieldErrors } };
  }

  try {
    const vehicle = await createVehicleViaSource(parsed.data);
    return { ok: true, vehicle };
  } catch (err) {
    return { ok: false, error: mapThrownError(err) };
  }
}
