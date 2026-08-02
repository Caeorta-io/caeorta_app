/**
 * Pure diagnostics ordering for the vehicle dashboard.
 *
 * The data seam hands diagnostics back newest-first by `generated_at` (see
 * `fetchRecentDiagnostics`); the preview panel wants them surfaced by SEVERITY
 * first. That re-ordering is a presentation concern, so it lives here as a pure,
 * client-side sort — NOT a new data-source capability (the brief is explicit:
 * sort after the hook returns, don't push it into `source.ts`/the mocks).
 *
 * No React-Native / React imports, so the rule is unit-testable in plain
 * Node/vitest (mirrors `connectionState.ts`).
 */
import type { Tables } from '@caeorta/supabase';

/**
 * Sort rank per severity (lower = more urgent, surfaces first). `severity` is a
 * plain `text` column (no DB enum), so an unrecognised value sorts AFTER all the
 * known tiers rather than crashing — defensive against vocabulary drift from the
 * AI-agent contract (see docs/06_AI_Agent_Contract.md).
 */
export const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const UNKNOWN_SEVERITY_RANK = Number.MAX_SAFE_INTEGER;

function severityRank(severity: string): number {
  return SEVERITY_RANK[severity] ?? UNKNOWN_SEVERITY_RANK;
}

/**
 * Order diagnostics for the preview: by severity (critical → warning → info →
 * unknown), then most-recent `generated_at` first within each severity tier.
 *
 * Returns a NEW array (does not mutate the input). An unparseable `generated_at`
 * is treated as oldest so a malformed row never jumps to the top of its tier.
 */
export function sortDiagnosticsByPriority(
  diagnostics: readonly Tables<'diagnostic_outputs'>[],
): Tables<'diagnostic_outputs'>[] {
  return [...diagnostics].sort((a, b) => {
    const bySeverity = severityRank(a.severity) - severityRank(b.severity);
    if (bySeverity !== 0) return bySeverity;

    // Newest first. Date.parse → NaN for bad input; coerce to -Infinity (oldest).
    const aTime = Date.parse(a.generated_at);
    const bTime = Date.parse(b.generated_at);
    const aSafe = Number.isNaN(aTime) ? -Infinity : aTime;
    const bSafe = Number.isNaN(bTime) ? -Infinity : bTime;
    return bSafe - aSafe;
  });
}

// ─── DTC → related diagnostic (design §6 S6, §7) ─────────────────────────────

/**
 * The diagnostic the agent linked to a given DTC, or `null` when nothing references it.
 * Backs design §6 `S6`'s "related Diagnostic Card" and §7's
 * `DTC detail | related | → Diagnostic detail (S2)` row.
 *
 * `diagnostic_outputs.referenced_dtc_ids` is a `uuid[]` column (docs/05): the agent may
 * cite several codes in one output, and several outputs may cite the same code. S6 shows
 * ONE card (§6 says "a related Diagnostic Card", singular), so this resolves the single
 * best match rather than a list: highest severity first, then most recent — the same
 * priority order {@link sortDiagnosticsByPriority} uses, so "the related diagnostic" means
 * the same thing here as "the top diagnostic" does everywhere else in the app.
 *
 * NEVER THROWS, and never mismatches:
 *   • an empty/whitespace `dtcId` matches nothing (guards a route param that hasn't
 *     resolved yet — `useLocalSearchParams` can hand back an empty string on first render);
 *   • a row whose `referenced_dtc_ids` is absent or not an array is skipped rather than
 *     crashing the screen. The generated type says `string[]`, but a live PostgREST row is
 *     unvalidated at this boundary — the same defensive stance `deriveDtcBadgeSeverity`
 *     takes on `severity_raw`.
 *
 * Pure: returns a row from the input or `null`, and does not mutate the input.
 */
export function findDiagnosticForDtc(
  diagnostics: readonly Tables<'diagnostic_outputs'>[],
  dtcId: string,
): Tables<'diagnostic_outputs'> | null {
  if (typeof dtcId !== 'string' || dtcId.trim().length === 0) return null;

  const linked = diagnostics.filter((d) => {
    const ids: unknown = d.referenced_dtc_ids;
    return Array.isArray(ids) && ids.includes(dtcId);
  });

  // `sortDiagnosticsByPriority` copies before sorting, so the caller's array is untouched.
  return sortDiagnosticsByPriority(linked)[0] ?? null;
}

// ─── Diagnostic Card visual state (design §5.1 / §4.3) ───────────────────────

/**
 * The four visual states a Diagnostic Card renders (design §5.1 `state` property).
 * Three sit on the severity heat-ramp (§4.3: info → warning → critical); the
 * fourth, `insufficient_data`, sits OFF the ladder — neutral + dashed, never a
 * severity colour (design principle #2 / §4.3).
 */
export type DiagnosticCardState = 'info' | 'warning' | 'critical' | 'insufficient_data';

/**
 * `severity` → on-ladder card state. `severity` is a plain `text` column (no DB
 * enum, per docs/06), so this is a lookup with a defensive fallback below rather
 * than a total map — mirrors {@link SEVERITY_RANK}'s tolerance of vocabulary drift.
 */
const CARD_STATE_BY_SEVERITY: Record<string, DiagnosticCardState> = {
  critical: 'critical',
  warning: 'warning',
  info: 'info',
};

/**
 * Safe fallback for an unrecognised `severity`: the quietest on-ladder state.
 * `info` "must not manufacture urgency" (§4.3), so an unknown value from a future
 * agent version renders calmly rather than escalating — never throws (mirrors the
 * `UNKNOWN_SEVERITY_RANK` handling above).
 */
const DEFAULT_CARD_STATE: DiagnosticCardState = 'info';

/**
 * CANONICAL derivation of a Diagnostic Card's visual state from a
 * `diagnostic_outputs` row. Every surface that renders the card MUST call this —
 * never re-derive the severity→state / insufficient-data rule inline (same
 * discipline as {@link deriveConnectionState}).
 *
 * Precedence (first match wins):
 *   1. `insufficient_data` in EITHER `category` OR `severity` → `'insufficient_data'`
 *      (OFF the ladder, §4.3). The contract's "I don't know" path (docs/06) models it
 *      as a `category` (paired with `severity='info'`), while this app's existing
 *      mocks / `driveHealth` use it as a `severity` sentinel — recognising both keeps
 *      this canonical helper robust to real rows of either shape, so the card never
 *      falsely lands on the ladder. It wins over whatever else is stamped.
 *      (The canonical vocabulary — category vs severity — is an open cross-track
 *      reconciliation item, adjacent to CF-07 / the docs/06 open questions; not
 *      resolved here.)
 *   2. otherwise, map `severity` on the ladder, defaulting to {@link DEFAULT_CARD_STATE}
 *      for an unrecognised value (never throws).
 */
export function deriveDiagnosticCardState(
  output: Pick<Tables<'diagnostic_outputs'>, 'category' | 'severity'>,
): DiagnosticCardState {
  if (output.category === 'insufficient_data' || output.severity === 'insufficient_data') {
    return 'insufficient_data';
  }
  return CARD_STATE_BY_SEVERITY[output.severity] ?? DEFAULT_CARD_STATE;
}

/**
 * Whether the card's mark-seen action shows the critical acknowledgement label
 * ("I've got it") instead of the default ("Mark as seen"). Critical is a single
 * calm acknowledgement, not a gauntlet (design principle #7). Pure and i18n-free
 * (the component maps the boolean to a locale key) so the swap is unit-testable in
 * plain Node — the one place this rule lives.
 */
export function usesCriticalAcknowledgeLabel(state: DiagnosticCardState): boolean {
  return state === 'critical';
}
