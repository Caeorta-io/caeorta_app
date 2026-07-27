/**
 * DTC presentation derivations — badge severity, S5 grouping, freeze-frame → Metric Tiles.
 *
 * `dtcs.freeze_frame_metrics` is stored as a flat `key → number` jsonb bag (the
 * telemetry `metrics` blob captured at DTC first-seen time; see `@caeorta/types`
 * `freezeFrameMetricsSchema`). Design §6 `S6` renders it as "freeze-frame conditions
 * (Metric Tile instances)", and a Metric Tile (§5.5) has named `value` / `unit` /
 * `label` layers. Turning the stored bag into those triples is a PRESENTATION step —
 * unit and precision are not stored anywhere — so it lives here, app-side.
 *
 * No React / React-Native imports, so this is unit-testable in plain Node/vitest —
 * same convention as `diagnostics.ts`, `driveHealth.ts` and `format.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(metric-keys): the keys below are the PROVISIONAL jsonb vocabulary owned by the
 *   hardware/AI-agent contract, not this repo — the same set as
 *   `lib/data/mocks.ts` `PROVISIONAL_METRIC_KEYS`. See CF-07 / R22. A key that the
 *   device actually writes but this map omits is silently dropped from the panel
 *   (not an error), so this MUST be reconciled before the `dtcs` capability flips
 *   to 'live'. The same provisional set is duplicated in the drive-detail
 *   `PEAK_METRICS` map and the diagnostic-card harness; consolidating those three
 *   into one display registry is deliberately left for the CF-07 reconciliation pass,
 *   so the canonical keys are moved in exactly one edit rather than three.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  deriveDtcGrouping,
  freezeFrameMetricsSchema,
  type Dtc,
  type DtcGrouping,
  type FreezeFrameMetrics,
} from '@caeorta/types';
import type { Tables } from '@caeorta/supabase';

// ─── Badge severity (design §6 S5 · §4.3 · §11) ──────────────────────────────

/**
 * The bounded UI severity a DTC's code badge is tinted with.
 *
 * NOT the same thing as `diagnostic_outputs.severity` and NOT rankable with
 * {@link SEVERITY_RANK} from `lib/diagnostics.ts`: that map keys on the AI agent's
 * three-tier vocabulary (docs/06), whereas a DTC carries `severity_raw` — free text
 * straight off the ECU, with no CHECK constraint and no agreed vocabulary. The two
 * happen to share three tier NAMES; they do not share a source, a guarantee, or a
 * fallback policy. Hence a separate, closed union with an explicit `'unknown'` member
 * rather than a reuse.
 *
 * `'unknown'` sits OFF the §4.3 heat ramp — neutral slate + dashed, the same treatment
 * `insufficient_data` gets on a Diagnostic Card. It reads "we can't rank this," never
 * "this is fine" and never "this is urgent".
 */
export type DtcBadgeSeverity = 'critical' | 'warning' | 'info' | 'unknown';

/**
 * Normalised `severity_raw` → badge severity.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO(dtc-severity-vocab) → CF-30 (severity-vs-category vocabulary) / CF-07.
 * THE CANONICAL `severity_raw` SET IS UNCONFIRMED. `dtcs.severity_raw` is plain
 * `text` (see migration 20260602130000) — no CHECK, no enum, and docs/05 documents it
 * only as "as reported by ECU". The keys below are therefore exactly the values the
 * mock fixtures carry (`lib/data/mocks.ts`, whose casing deliberately drifts:
 * 'critical' / 'WARN' / 'warning' / 'info' / 'INFO' / null) — they are NOT an invented
 * canonical vocabulary, and this map must not be grown by guesswork.
 *
 * A canonical three-tier ladder DOES exist adjacently: `dtc_lookup.severity_hint` is
 * CHECK-constrained to ('info','warning','critical') (Platform migration
 * 20260615000002), which is the same ladder as §4.3. That is PER-CODE reference data,
 * not the per-row ECU text, so it can't bound `severity_raw` — but it is why the
 * target union above matches that ladder instead of introducing a fourth vocabulary,
 * and it is the obvious fallback source for a row whose `severity_raw` is null once
 * `dtc_lookup` is wired into the seam. Not wired today; see the CF-31 flip note.
 *
 * Reconcile before `DATA_SOURCE.dtcs` flips to 'live': a real ECU string this map
 * omits renders a neutral 'unknown' badge rather than its true tier — under-stated,
 * never over-stated, and never a crash, but still wrong.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const BADGE_SEVERITY_BY_RAW: Record<string, DtcBadgeSeverity> = {
  critical: 'critical',
  warning: 'warning',
  warn: 'warning',
  info: 'info',
};

/**
 * CANONICAL `severity_raw` → badge severity derivation. Every surface that tints a DTC
 * by severity MUST call this — never re-derive the rule inline (the same discipline as
 * `deriveConnectionState` and `deriveDiagnosticCardState`).
 *
 * NEVER THROWS, and never mis-tints. Input is normalised (trimmed + lowercased) before
 * lookup, so the fixtures' casing drift ('WARN', 'INFO') resolves; anything the map
 * doesn't recognise — null, empty string, whitespace, a non-string value arriving from
 * an unvalidated live row, or a future ECU's wording — falls through to `'unknown'`.
 *
 * The fallback is deliberately `'unknown'` (off-ladder) rather than `'info'` (the
 * quietest ON-ladder tier, which is what `deriveDiagnosticCardState` uses). A
 * diagnostic is authored by the agent, so an unrecognised severity there is vocabulary
 * drift within a known system and rendering it quietly is honest. A DTC's severity is
 * whatever the ECU happened to write; claiming "info" for a string we cannot read would
 * assert a tier we don't have — §8's calibrated honesty says show that we don't know.
 */
export function deriveDtcBadgeSeverity(severityRaw: string | null | undefined): DtcBadgeSeverity {
  // Defensive `typeof`: `severity_raw` is typed `string | null`, but `toDtc` spreads the
  // row rather than zod-parsing every scalar, so a live PostgREST row could carry
  // anything. A non-string must degrade, not throw.
  if (typeof severityRaw !== 'string') return 'unknown';

  const normalised = severityRaw.trim().toLowerCase();
  if (normalised.length === 0) return 'unknown';

  return BADGE_SEVERITY_BY_RAW[normalised] ?? 'unknown';
}

/**
 * Sort rank per badge severity (lower = more urgent, surfaces first). Unlike
 * {@link SEVERITY_RANK} in `lib/diagnostics.ts` this is a TOTAL map over a closed
 * union, so it needs no unknown-value fallback — `'unknown'` is a real member and
 * ranks last by design (an unrankable code shouldn't outrank a known one).
 */
const BADGE_SEVERITY_RANK: Record<DtcBadgeSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  unknown: 3,
};

// ─── S5 grouping (design §6 S5) — THE three-way-split point ──────────────────

/**
 * The S5 sections, keyed by grouping. Declared as a `Record<DtcGrouping, …>` on purpose:
 * it is structurally tied to `DTC_GROUPINGS` in `@caeorta/types`, so narrowing that
 * union makes {@link groupDtcs} a COMPILE ERROR rather than a silently dead branch.
 */
export type DtcGroups = Record<DtcGrouping, Dtc[]>;

/**
 * CANONICAL Active / Pending / History split for the S5 list (design §6). This is the
 * ONE place the three-way split is decided; the screen renders whatever this returns
 * and derives nothing itself.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COLLAPSING TO TWO GROUPS LATER (TODO(dtc-pending) → CF-29) IS A TWO-EDIT CHANGE.
 *
 * `'pending'` has NO live source. `dtcs` models state as binary — `is_active` plus
 * `cleared_at` — with no pending/confirmed column, so `deriveDtcGrouping` in
 * `@caeorta/types` can only ever return 'active' | 'history'. Every `'pending'` value
 * in the app originates from exactly one thing: the mock-only `MOCK_PENDING_DTC_IDS`
 * overlay in `lib/data/mocks.ts`. If the founder cuts the group (CF-29 resolution (b)),
 * the whole removal is:
 *
 *   1. drop `'pending'` from `DTC_GROUPINGS` in `packages/types/src/dtc.ts`
 *      → `DtcGroups` narrows automatically → the `pending: []` line below fails to
 *        compile → delete it. That is the ONLY edit needed in this file.
 *   2. delete `MOCK_PENDING_DTC_IDS` + the overlay branch in `toMockDtc`.
 *
 * The S5 screen needs NO edit at all: it builds its sections by mapping over
 * `DTC_GROUPING_ORDER` and looking up i18n by key, so a two-member union renders two
 * sections on its own. Nothing else in the app reads `grouping`. Do not add a second
 * consumer of the raw `grouping` field without moving that logic in here.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ordering within each group is badge severity (critical → warning → info → unknown),
 * then `last_seen_at` newest-first. §6 specifies the grouping but not the in-group
 * order; this is the founder's session-34 call, and it mirrors
 * `sortDiagnosticsByPriority`'s severity-then-recency shape. An unparseable
 * `last_seen_at` is treated as oldest, so a malformed row never jumps its tier.
 *
 * Pure; never throws; does not mutate the input. A row carrying a `grouping` outside
 * the union (only reachable from an unvalidated live row) degrades into `active` — the
 * visible group — rather than vanishing from the list, matching `deriveDtcGrouping`'s
 * own degrade-to-visible policy.
 */
export function groupDtcs(dtcs: readonly Dtc[]): DtcGroups {
  const groups: DtcGroups = { active: [], pending: [], history: [] };

  for (const dtc of dtcs) {
    // `noUncheckedIndexedAccess` makes this lookup `Dtc[] | undefined`, which is exactly
    // the degrade-to-visible case above: an off-union `grouping` lands in `active`.
    const bucket = groups[dtc.grouping] ?? groups.active;
    bucket.push(dtc);
  }

  for (const bucket of Object.values(groups)) {
    bucket.sort(compareDtcsForList);
  }

  return groups;
}

/** Badge severity, then `last_seen_at` DESC. See {@link groupDtcs} for the rationale. */
function compareDtcsForList(a: Dtc, b: Dtc): number {
  const bySeverity =
    BADGE_SEVERITY_RANK[deriveDtcBadgeSeverity(a.severity_raw)] -
    BADGE_SEVERITY_RANK[deriveDtcBadgeSeverity(b.severity_raw)];
  if (bySeverity !== 0) return bySeverity;

  // Newest first. Date.parse → NaN for bad input; coerce to -Infinity (oldest).
  const aTime = Date.parse(a.last_seen_at);
  const bTime = Date.parse(b.last_seen_at);
  const aSafe = Number.isNaN(aTime) ? -Infinity : aTime;
  const bSafe = Number.isNaN(bTime) ? -Infinity : bTime;
  return bSafe - aSafe;
}

// ─── Freeze frame → Metric Tiles (design §5.5, S6) ───────────────────────────

/**
 * One freeze-frame Metric Tile (§5.5). Structurally compatible with the Diagnostic
 * Card's `DiagnosticMetric`, so the same tile data can back either surface; declared
 * here rather than imported so this module keeps zero component dependencies.
 */
export interface FreezeFrameTile {
  /** Provisional metric key — doubles as the tile caption until §S6 adds i18n labels. */
  key: string;
  /** Pre-formatted display value, e.g. '118' or '101.5'. */
  value: string;
  /** Unit suffix, e.g. 'kPa', '°C'. Absent for unitless readings. */
  unit?: string;
}

interface MetricDisplay {
  unit?: string;
  decimals: number;
}

/** Provisional key → display unit + precision. TODO(metric-keys), see the header. */
const METRIC_DISPLAY: Record<string, MetricDisplay> = {
  rpm: { unit: 'rpm', decimals: 0 },
  speed_kph: { unit: 'kph', decimals: 0 },
  coolant_temp_c: { unit: '°C', decimals: 1 },
  engine_load_pct: { unit: '%', decimals: 0 },
  throttle_pct: { unit: '%', decimals: 0 },
  intake_air_temp_c: { unit: '°C', decimals: 1 },
  boost_pressure_kpa: { unit: 'kPa', decimals: 1 },
  battery_voltage: { unit: 'V', decimals: 1 },
  fuel_level_pct: { unit: '%', decimals: 0 },
};

/**
 * Display order for the freeze-frame panel — the readings that explain a fault first
 * (load/boost/temperature), then the ambient context. Keys absent from the blob are
 * skipped, so a partial capture renders whatever it does carry.
 */
const TILE_ORDER: readonly string[] = [
  'rpm',
  'boost_pressure_kpa',
  'coolant_temp_c',
  'engine_load_pct',
  'throttle_pct',
  'speed_kph',
  'intake_air_temp_c',
  'battery_voltage',
  'fuel_level_pct',
];

/**
 * Parse a raw `freeze_frame_metrics` value (the opaque `Json` column) into a validated
 * metrics bag, or `null` when there is nothing usable.
 *
 * NEVER THROWS — this is the seam's boundary parse, and a DTC with a malformed freeze
 * frame must still render (the code, title and dates are what matter; the panel simply
 * doesn't appear). Returns `null` for null/absent, a non-object, an array, or a blob
 * whose values aren't all finite numbers.
 */
export function parseFreezeFrameMetrics(raw: unknown): FreezeFrameMetrics | null {
  if (raw === null || raw === undefined) return null;
  const parsed = freezeFrameMetricsSchema.safeParse(raw);
  if (!parsed.success) return null;
  return Object.keys(parsed.data).length > 0 ? parsed.data : null;
}

/**
 * CANONICAL `dtcs` row → {@link Dtc} conversion — the seam's boundary parse.
 *
 * Does two things the raw row can't express: narrows the opaque `Json`
 * `freeze_frame_metrics` column to a validated `key → number` bag (a malformed blob
 * becomes `null`, so downstream code never guards it again), and stamps the derived
 * `grouping`. BOTH the mock and the future live branch go through this, so the two
 * paths cannot produce structurally different rows.
 *
 * Never throws. Note the grouping can only ever be 'active' | 'history' here — the
 * mock seam layers 'pending' on top (TODO(dtc-pending) / CF-29).
 */
export function toDtc(row: Tables<'dtcs'>): Dtc {
  return {
    ...row,
    freeze_frame_metrics: parseFreezeFrameMetrics(row.freeze_frame_metrics),
    grouping: deriveDtcGrouping(row),
  };
}

/**
 * Freeze-frame blob → ordered Metric Tiles (§5.5). Pure; never throws. A key with no
 * entry in {@link METRIC_DISPLAY} still renders — unitless, to zero decimals — so an
 * unrecognised-but-valid reading from a future firmware is shown rather than hidden.
 * Returns `[]` for a null/malformed blob, which the caller reads as "no panel".
 */
export function toFreezeFrameTiles(raw: unknown): FreezeFrameTile[] {
  const metrics = parseFreezeFrameMetrics(raw);
  if (metrics === null) return [];

  // Known keys first, in TILE_ORDER; then any unrecognised keys, alphabetically, so
  // ordering is deterministic regardless of jsonb key order.
  const known = TILE_ORDER.filter((key) => key in metrics);
  const extra = Object.keys(metrics)
    .filter((key) => !TILE_ORDER.includes(key))
    .sort();

  return [...known, ...extra].map((key) => {
    const value = metrics[key] as number;
    const display = METRIC_DISPLAY[key];
    return {
      key,
      value: value.toFixed(display?.decimals ?? 0),
      ...(display?.unit !== undefined ? { unit: display.unit } : {}),
    };
  });
}
