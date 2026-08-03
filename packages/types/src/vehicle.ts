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
 * The canonical ECU set. This is NOT a client-side invention — it mirrors the CHECK
 * constraint that has been on the column since the initial schema:
 *
 *   ecu_type text CHECK (ecu_type IN ('oem','haltech','aem','motec','link','other'))
 *   — supabase/migrations/20260602130000_initial_schema.sql
 *
 * The earlier "free text until the hardware track locks a set" note here was wrong:
 * it inferred "no constraint" from `database.types.ts` showing `ecu_type: string | null`,
 * but Supabase's type generator only renders true Postgres enum *types* as unions —
 * it never represents CHECK constraints. Any value outside this set is a guaranteed
 * 23514 check violation once `DATA_SOURCE.createVehicle` flips to 'live', so the
 * client validates the same set the database does.
 *
 * Order is display order in the add-vehicle picker: 'oem' first (the common case),
 * 'other' last (the escape hatch).
 */
export const ECU_TYPES = ['oem', 'haltech', 'aem', 'motec', 'link', 'other'] as const;
export type EcuType = (typeof ECU_TYPES)[number];

/**
 * Upper bound for the free-text `modifications` note. Bounded because it crosses the
 * wire as a scalar the Edge Function length-checks, and because it is fed to the
 * agent as LLM context — a runaway field is a prompt-budget problem, not just a
 * storage one.
 */
export const MAX_MODIFICATIONS_LENGTH = 500;

/**
 * Request body for `create_vehicle`. `device_id` is the device being linked to the
 * new vehicle — NOT user-entered; the pairing flow supplies the claimed device's id.
 * `owner_user_id` is intentionally absent: the Edge Function reads `auth.uid()`
 * server-side, so the client never sends (or can spoof) the owner.
 *
 * `ecu_type` is REQUIRED and enum-constrained. It is the agent's cold-start
 * modified-vs-stock signal: `ecu_type != 'oem'` marks a car modified from drive one,
 * which keeps stock reference bands advisory rather than alarm-capable (a tuned car's
 * deliberate AFR/boost is not a fault). Left unpopulated, the agent falls back to its
 * most conservative — and least useful — behaviour. See docs/AI_Agent_Contract §4.
 *
 * `modifications` is optional free text, deliberately NOT enum-constrained: the split
 * is that deterministic code keys on `ecu_type` while the LLM reads `modifications` as
 * prose context. It crosses the wire as a plain string; the Edge Function encodes it
 * into the jsonb column as `{"notes": "..."}` (or leaves the `'{}'` default when
 * absent), so the client never controls raw jsonb.
 */
export const createVehicleInputSchema = z.object({
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(MIN_VEHICLE_YEAR).max(MAX_VEHICLE_YEAR),
  nickname: z.string().min(1).max(60),
  ecu_type: z.enum(ECU_TYPES),
  modifications: z.string().max(MAX_MODIFICATIONS_LENGTH).optional(),
  device_id: z.string().uuid(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

/**
 * The jsonb shape `modifications` is persisted as. Kept here next to the schema so the
 * mock seam and the Edge Function encode it identically — the app reads the column
 * back off the returned row, so a mismatch would only surface post-flip.
 */
export function encodeModifications(notes: string | undefined): Record<string, string> {
  const trimmed = notes?.trim();
  return trimmed ? { notes: trimmed } : {};
}

/** Exposed so the client form and the Edge Function can render/echo the same bounds. */
export const VEHICLE_YEAR_BOUNDS = { min: MIN_VEHICLE_YEAR, max: MAX_VEHICLE_YEAR } as const;
