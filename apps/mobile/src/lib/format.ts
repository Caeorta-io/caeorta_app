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
