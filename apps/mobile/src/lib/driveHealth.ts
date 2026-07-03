/**
 * Derived, three-state drive health — the shared primitive behind the health pill
 * on the drive-detail screen, the drives list, and the last-drive card.
 *
 * This is the "temperature-encodes-urgency" ladder (docs/design/00_design_system.md
 * §4.3) collapsed to a per-drive verdict:
 *   • `check_now`  — the drive has at least one `critical` diagnostic (redline).
 *   • `needs_look` — no critical, but at least one `warning` (amber).
 *   • `clean`      — nothing that elevates health (including zero diagnostics).
 *
 * `info` and `insufficient_data` (and ANY unrecognised severity) never elevate
 * health above `clean`: `info` is the quiet majority case, and `insufficient_data`
 * sits OFF the ladder ("more data needed", not a health state) per §4.3. Severity is
 * a plain `text` column (no DB enum), so unknown values are treated defensively —
 * exactly as {@link SEVERITY_RANK} already does.
 *
 * No React / React-Native imports, so this is unit-testable in plain Node/vitest —
 * same convention as `diagnostics.ts` and `format.ts`.
 */
import type { Tables } from '@caeorta/supabase';

import { SEVERITY_RANK } from './diagnostics';

/** The three derived health tiers, coolest → hottest. */
export type DriveHealth = 'clean' | 'needs_look' | 'check_now';

/**
 * The minimal severity signal a drive's diagnostics imply — whether any elevating
 * severity is present. This is what the paginated drives list carries per row
 * (computed by the query, not a per-row fetch) so it can render the same pill
 * without loading every drive's full diagnostics. {@link deriveDriveHealth} reduces
 * a full diagnostics array to exactly this before mapping, so both paths share ONE
 * tier rule ({@link driveHealthFromFlags}).
 */
export interface DriveHealthFlags {
  hasCritical: boolean;
  hasWarning: boolean;
}

/**
 * THE tier mapping — the single place the three-state rule lives. Critical wins
 * over warning; warning over clean. Callers that already have the two flags (the
 * drives list, from its query) use this directly; callers with a full diagnostics
 * array go through {@link deriveDriveHealth}, which funnels back into here.
 */
export function driveHealthFromFlags({ hasCritical, hasWarning }: DriveHealthFlags): DriveHealth {
  if (hasCritical) return 'check_now';
  if (hasWarning) return 'needs_look';
  return 'clean';
}

// Ranks that elevate health, read off the shared SEVERITY_RANK so the ordering is
// defined in exactly one place. `info` (rank 2) and unknown/insufficient_data
// (absent from the map) fall through as non-elevating.
const CRITICAL_RANK = SEVERITY_RANK.critical;
const WARNING_RANK = SEVERITY_RANK.warning;

/**
 * Derive a drive's health from its linked diagnostics. Pure; does not mutate the
 * input. Reduces the array to {@link DriveHealthFlags} using {@link SEVERITY_RANK}
 * (so `info`/`insufficient_data`/unknown never elevate), then applies the single
 * tier rule in {@link driveHealthFromFlags}. Zero diagnostics → `clean`.
 */
export function deriveDriveHealth(
  diagnostics: readonly Tables<'diagnostic_outputs'>[],
): DriveHealth {
  let hasCritical = false;
  let hasWarning = false;

  for (const { severity } of diagnostics) {
    const rank = SEVERITY_RANK[severity];
    if (rank === CRITICAL_RANK) hasCritical = true;
    else if (rank === WARNING_RANK) hasWarning = true;
  }

  return driveHealthFromFlags({ hasCritical, hasWarning });
}
