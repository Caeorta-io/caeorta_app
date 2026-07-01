/**
 * Pure helpers for the date-grouped drives list.
 *
 * No React / RN imports — unit-testable in plain Node. The screen renders a single
 * FlatList (per the Week-4 "use FlatList for lists" instruction) over a flat array
 * that interleaves date-header rows with drive rows; {@link buildDriveListItems}
 * produces that array from a newest-first list of drives.
 *
 * Grouping is by UTC calendar date derived from `started_at`. This is deterministic
 * (no device-timezone dependence, so tests are stable) and correct for the mock
 * fixtures, whose timestamps are UTC. TODO(local-tz): once drives carry a real
 * timezone/offset, group by the driver's local date instead of UTC.
 */
import type { Tables } from '@caeorta/supabase';

/** English short month names, indexed 0–11. The app is English-only in v1 (i18next). */
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * A single row in the flat FlatList data array: either a date section header or a
 * drive. `id` is a stable, unique key for `keyExtractor`.
 */
export type DriveListItem =
  | { kind: 'header'; id: string; dateKey: string; label: string }
  | { kind: 'drive'; id: string; drive: Tables<'drives'> };

/**
 * UTC calendar-date key ('YYYY-MM-DD') for a drive's `started_at`. ISO-8601
 * timestamps start with exactly this, so the slice is the UTC date with no parsing.
 */
export function driveDateKey(startedAt: string): string {
  return startedAt.slice(0, 10);
}

/** Human date heading for a 'YYYY-MM-DD' key: "22 Jun 2026". Locale-neutral (English v1). */
export function formatDriveDateHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) return dateKey; // defensive: bad key → raw
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** Clock time of a drive's start, "07:12" (UTC — see the module note). "–" for unparseable input. */
export function formatDriveTime(startedAt: string): string {
  const ms = Date.parse(startedAt);
  if (Number.isNaN(ms)) return '–';
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Interleave date-header rows into a newest-first list of drives, one header each
 * time the UTC calendar date changes. Assumes `drives` is already ordered
 * newest-first (as the fetch layer returns them); does not re-sort.
 */
export function buildDriveListItems(drives: Tables<'drives'>[]): DriveListItem[] {
  const items: DriveListItem[] = [];
  let currentKey: string | null = null;

  for (const drive of drives) {
    const key = driveDateKey(drive.started_at);
    if (key !== currentKey) {
      currentKey = key;
      items.push({ kind: 'header', id: `header-${key}`, dateKey: key, label: formatDriveDateHeading(key) });
    }
    items.push({ kind: 'drive', id: drive.id, drive });
  }

  return items;
}
