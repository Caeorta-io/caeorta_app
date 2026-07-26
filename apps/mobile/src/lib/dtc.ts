/**
 * DTC presentation derivations — freeze-frame → Metric Tiles.
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
  type FreezeFrameMetrics,
} from '@caeorta/types';
import type { Tables } from '@caeorta/supabase';

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
