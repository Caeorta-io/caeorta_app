// DTC domain — Diagnostic Trouble Codes stored in `public.dtcs` (docs/05 § Diagnostics).
// Backs the Week-5 DTC list (design §6 `S5`) and DTC detail (`S6`) screens.
//
// This schema MIRRORS the real table as generated in `packages/supabase`
// (`Tables<'dtcs'>`) — every field below is a column that exists on `main` today,
// including `freeze_frame_metrics` (Platform migration 20260615000001). Nothing here
// is an invented App-side shape; the two provisional areas are called out in the
// TODOs below and neither adds a field the DB doesn't have.
//
// Validate at the seam boundary (DB ↔ app) with `dtcRowSchema`, same discipline as
// `createVehicleInputSchema` — the jsonb column is `Json` (opaque) on the generated
// type, so the compiler cannot catch a shape drift there; only a parse can.
import { z } from 'zod';

/**
 * `dtcs.freeze_frame_metrics` — the OBD sensor snapshot captured when a DTC is first
 * seen, rendered as Metric Tiles on the S6 detail screen (design §5.5).
 *
 * SHAPE NOTE: this is a flat `key → number` bag, NOT a `{ value, unit, label }` triple.
 * That is what the ingestion path actually writes: `device_sync_chunk` stores a
 * telemetry row's `metrics` blob verbatim (see `supabase/functions/device_sync_chunk`),
 * so a freeze frame is the same vocabulary as `telemetry.metrics` / `peak_metrics`.
 * Unit + display label are a PRESENTATION concern derived app-side, not stored.
 *
 * TODO(metric-keys): the KEYS inside this record are the provisional jsonb vocabulary
 *   owned by the hardware/AI-agent contract, not this repo — the same set flagged in
 *   `apps/mobile/src/lib/data/mocks.ts` (`PROVISIONAL_METRIC_KEYS`). See CF-07 / R22.
 *   The column is real; the key names are the open reconciliation. A wrong key yields
 *   a silently-empty freeze-frame panel, not an error — reconcile before any live flip.
 *
 * Non-finite and non-numeric values are rejected rather than coerced, so a malformed
 * blob fails at the boundary instead of rendering `NaN` in a tile.
 */
export const freezeFrameMetricsSchema = z.record(z.string(), z.number().finite());
export type FreezeFrameMetrics = z.infer<typeof freezeFrameMetricsSchema>;

/**
 * A `dtcs` row. Field-for-field with `Tables<'dtcs'>`; the seam's mock fixtures are
 * pinned to the generated type with `satisfies`, so a Platform column change breaks
 * the build there and a *value* drift is caught here.
 *
 * Timestamps are validated as non-empty strings rather than `z.string().datetime()`:
 * PostgREST renders `timestamptz` with a numeric offset (`+00:00`), which zod's
 * default `.datetime()` rejects. Callers parse with `Date.parse` defensively — the
 * same convention as `sortDiagnosticsByPriority`.
 */
export const dtcRowSchema = z.object({
  id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  sync_session_id: z.string().uuid().nullable(),
  /** Raw OBD-II code as reported by the ECU, e.g. 'P0299'. */
  code: z.string().min(1).max(16),
  /** OEM/known description. Often raw SAE jargon — see the app-side title seam. */
  description: z.string().nullable(),
  /** Free text as reported by the ECU; NOT the agent's severity vocabulary (docs/06). */
  severity_raw: z.string().nullable(),
  first_seen_at: z.string().min(1),
  last_seen_at: z.string().min(1),
  is_active: z.boolean(),
  cleared_at: z.string().min(1).nullable(),
  cleared_by_user_id: z.string().uuid().nullable(),
  freeze_frame_metrics: freezeFrameMetricsSchema.nullable(),
});
export type DtcRow = z.infer<typeof dtcRowSchema>;

/**
 * The three groups design §6 `S5` renders a DTC list under: Active / Pending / History.
 *
 * TODO(dtc-pending): `'pending'` has NO live source. The `dtcs` table models DTC state
 *   as binary — `is_active` plus a `cleared_at` timestamp — with no pending/status
 *   column and no confirmed-vs-pending flag (OBD-II distinguishes a pending code, set
 *   after one failed drive cycle, from a confirmed one; the schema does not). Until
 *   Platform adds that column (or the founder rules the group out of v1), `'pending'`
 *   is reachable ONLY from the mock seam. See CF-29.
 */
export const DTC_GROUPINGS = ['active', 'pending', 'history'] as const;
export type DtcGrouping = (typeof DTC_GROUPINGS)[number];

/**
 * Grouping derivable from a REAL row. Deliberately narrower than {@link DtcGrouping}:
 * the return type records, in the type system, that no live row can produce
 * `'pending'` today (TODO(dtc-pending) / CF-29). When Platform lands the column, widen
 * this return type and the omission becomes a compile error at every call site.
 */
export type DerivableDtcGrouping = Exclude<DtcGrouping, 'pending'>;

/**
 * Derive a row's group. History = the code has been cleared (either `cleared_at` is
 * stamped or the row is no longer active); anything else is Active.
 *
 * Never throws — a malformed row degrades to `'active'` (the visible group) rather
 * than disappearing from the list, mirroring the never-throws policy on the seam's
 * other derivations (`deriveDriveHealth`, `deriveDiagnosticCardState`).
 */
export function deriveDtcGrouping(
  row: Pick<DtcRow, 'is_active' | 'cleared_at'>,
): DerivableDtcGrouping {
  if (row.cleared_at !== null || row.is_active === false) return 'history';
  return 'active';
}

/**
 * A DTC as the app consumes it: the row plus the group it renders under. The seam
 * stamps `grouping` (see `lib/data/source.ts`) so screens group on ONE field and never
 * re-derive the rule — and so the mock-only `'pending'` value has exactly one origin.
 */
export type Dtc = DtcRow & { grouping: DtcGrouping };

/**
 * Display order of the three groups on S5: what's wrong now, then what might be, then
 * what's resolved. Exported so the list screen and its tests share one ordering.
 */
export const DTC_GROUPING_ORDER: readonly DtcGrouping[] = ['active', 'pending', 'history'];
