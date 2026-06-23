// Vehicle domain — the request contract for the `create_vehicle` Edge Function
// (Platform track; see docs/create_vehicle_contract.md and docs/05_Database_Schema.md
// § vehicles). The App-track add-vehicle flow validates this shape client-side, the
// data-source mock re-parses it at the seam, and the Edge Function re-validates the
// same field rules server-side before inserting.
//
// One schema, three consumers — keep it the single source of truth for the field
// rules so the client form, the mock, and the function never drift.
import { z } from 'zod';

/**
 * Upper bound for `year`. Computed at module load from the current calendar year
 * plus one, so a model-year-ahead vehicle (common: 2027 models sold in 2026) is
 * accepted without yearly edits. The Edge Function applies the same `currentYear + 1`
 * rule server-side, so both sides shift together as the clock advances.
 */
const MAX_VEHICLE_YEAR = new Date().getUTCFullYear() + 1;

/** Earliest accepted model year — OBD-II era floor; nothing older is in scope. */
const MIN_VEHICLE_YEAR = 1980;

/**
 * Request body for `create_vehicle`. `device_id` is the device being linked to the
 * new vehicle — NOT user-entered; the pairing flow supplies the claimed device's id.
 * `owner_user_id` is intentionally absent: the Edge Function reads `auth.uid()`
 * server-side, so the client never sends (or can spoof) the owner.
 *
 * TODO(ecu_type): `ecu_type` is free text here because the `vehicles.ecu_type`
 *   column in `database.types.ts` is a plain `text` column with no DB enum/CHECK —
 *   the mock fixture even uses `'denso-gen4'`, which isn't in the value-set listed
 *   in docs/05. The canonical ECU set is owned by the hardware track; once it's
 *   locked, promote this to a `z.enum([...])` and add a matching CHECK constraint
 *   to the vehicles migration. This MUST be agreed before any `'live'` flip — see
 *   docs/create_vehicle_contract.md § Open question.
 */
export const createVehicleInputSchema = z.object({
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(MIN_VEHICLE_YEAR).max(MAX_VEHICLE_YEAR),
  nickname: z.string().min(1).max(60),
  ecu_type: z.string().min(1).max(60),
  device_id: z.string().uuid(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

/** Exposed so the client form and the Edge Function can render/echo the same bounds. */
export const VEHICLE_YEAR_BOUNDS = { min: MIN_VEHICLE_YEAR, max: MAX_VEHICLE_YEAR } as const;
