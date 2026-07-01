/**
 * Small, pure presentation formatters for the vehicle dashboard.
 *
 * No React / RN imports — unit-testable in plain Node and reusable across the
 * list (Week 3) and detail (Week 4) screens. Keep i18n out of here: these return
 * compact, locale-neutral tokens; screens wrap surrounding copy in `t()`.
 */
import type { Tables } from '@caeorta/supabase';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Placeholder shown when a value is missing (no sync yet, no drive distance, …). */
export const EMPTY_DASH = '–';

/**
 * Format an ISO timestamp as a compact relative time: "Just now", "2 min ago",
 * "2 h ago", "3 d ago". Returns {@link EMPTY_DASH} for `null` and for future or
 * unparseable timestamps (we never show "in 2 h" on a last-sync line).
 */
export function formatRelativeTime(iso: string | null, now: number = Date.now()): string {
  if (iso === null) return EMPTY_DASH;

  const then = Date.parse(iso);
  if (Number.isNaN(then)) return EMPTY_DASH;

  const ageMs = now - then;
  if (ageMs < 0) return EMPTY_DASH;
  if (ageMs < MINUTE_MS) return 'Just now';
  if (ageMs < HOUR_MS) return `${Math.floor(ageMs / MINUTE_MS)} min ago`;
  if (ageMs < DAY_MS) return `${Math.floor(ageMs / HOUR_MS)} h ago`;
  return `${Math.floor(ageMs / DAY_MS)} d ago`;
}

/**
 * Second-granular relative token for the live screen's "Updated X ago" line:
 * "0 s", "5 s", then "2 min" / "3 h" / "4 d" once past a minute. Unlike
 * {@link formatRelativeTime} (which floors everything under a minute to
 * "Just now"), this resolves seconds so a once-per-second re-render visibly
 * counts up. Returns {@link EMPTY_DASH} for `null` and for future/unparseable
 * timestamps. Locale-neutral: the screen wraps it as "Updated {{value}} ago".
 */
export function formatSecondsAgo(iso: string | null, now: number = Date.now()): string {
  if (iso === null) return EMPTY_DASH;

  const then = Date.parse(iso);
  if (Number.isNaN(then)) return EMPTY_DASH;

  const ageMs = now - then;
  if (ageMs < 0) return EMPTY_DASH;
  if (ageMs < MINUTE_MS) return `${Math.floor(ageMs / 1000)} s`;
  if (ageMs < HOUR_MS) return `${Math.floor(ageMs / MINUTE_MS)} min`;
  if (ageMs < DAY_MS) return `${Math.floor(ageMs / HOUR_MS)} h`;
  return `${Math.floor(ageMs / DAY_MS)} d`;
}

/**
 * One-line summary of a drive: "24.6 km · 36 min". Returns {@link EMPTY_DASH}
 * when distance or duration is missing (a drive row with null metrics, or no
 * drive at all). Distance is shown to one decimal; duration in whole minutes.
 */
export function formatDriveSummary(drive: Tables<'drives'> | null): string {
  if (drive === null) return EMPTY_DASH;
  const { distance_km, duration_seconds } = drive;
  if (distance_km === null || duration_seconds === null) return EMPTY_DASH;

  const km = distance_km.toFixed(1);
  const minutes = Math.floor(duration_seconds / 60);
  return `${km} km · ${minutes} min`;
}

/** Distance to one decimal + unit: "24.6 km". {@link EMPTY_DASH} for null. */
export function formatDistanceKm(distanceKm: number | null): string {
  if (distanceKm === null) return EMPTY_DASH;
  return `${distanceKm.toFixed(1)} km`;
}

/** Average speed to one decimal + unit: "40.4 kph". {@link EMPTY_DASH} for null. */
export function formatSpeedKph(speedKph: number | null): string {
  if (speedKph === null) return EMPTY_DASH;
  return `${speedKph.toFixed(1)} kph`;
}

/**
 * Duration from seconds: "36 min", or "1 h 5 min" once it reaches an hour. Hours
 * are dropped entirely under 60 min (never "0 h 36 min"); minutes are shown even
 * at a whole hour ("1 h 0 min") so the unit pair reads consistently. Seconds are
 * floored to whole minutes. {@link EMPTY_DASH} for null or negative input.
 */
export function formatDuration(durationSeconds: number | null): string {
  if (durationSeconds === null || durationSeconds < 0) return EMPTY_DASH;
  const totalMinutes = Math.floor(durationSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes} min`;
}

/** A peak-metric key paired with its numeric value, ready for display. */
export interface PeakMetric {
  key: string;
  value: number;
}

/**
 * Pull the requested keys (in order) out of a drive's `peak_metrics` jsonb, keeping
 * only those present with a finite numeric value — absent or non-numeric keys are
 * skipped silently (no empty rows). `peakMetrics` is the opaque `Json` column, so
 * this guards the shape at runtime rather than trusting the type.
 *
 * The CALLER supplies and caps the key list (the provisional vocabulary lives at the
 * call site, wrapped in its TODO(metric-keys) note); this helper is pure selection.
 */
export function selectPeakMetrics(
  peakMetrics: unknown,
  keys: readonly string[],
): PeakMetric[] {
  if (peakMetrics === null || typeof peakMetrics !== 'object' || Array.isArray(peakMetrics)) {
    return [];
  }
  const record = peakMetrics as Record<string, unknown>;
  const out: PeakMetric[] = [];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      out.push({ key, value });
    }
  }
  return out;
}
