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

import { formatDriveDateHeading } from './drives';

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

/**
 * Rank for a row that sits OFF the severity ladder. Same value as
 * {@link UNKNOWN_SEVERITY_RANK} but named separately because the REASON differs: an
 * unknown severity is vocabulary drift we tolerate, whereas `insufficient_data` is a
 * first-class contract state that legitimately belongs below every ladder tier — it is
 * the ABSENCE of a finding, not the quietest one (§4.3, design principle #2). Ranking it
 * as `info` would let "we couldn't tell" outrank nothing at all.
 */
const OFF_LADDER_RANK = UNKNOWN_SEVERITY_RANK;

/**
 * Whether a row is the contract's "I don't know" output — THE single either-field check,
 * shared by {@link deriveDiagnosticCardState} and {@link sortDiagnosticsByPriority} so a
 * card and the list it sits in can never disagree about what is off the ladder.
 *
 * Checks BOTH fields on purpose. The contract (§5 DDL + §7) models this as a
 * **category**, paired with `severity='info'`; the app's fixtures used to model it as a
 * `severity` sentinel. CF-30 reconciled the fixtures onto the contract shape, so the
 * sentinel no longer occurs in this repo — but the `severity` half of this check STAYS as
 * a defensive guard, because `severity` is a plain `text` column on the app side of the
 * seam and a live row is unvalidated at this boundary. Recognising either shape means the
 * worst case is a correctly-neutral card, never a false severity colour.
 */
export function isInsufficientData(
  output: Pick<Tables<'diagnostic_outputs'>, 'category' | 'severity'>,
): boolean {
  return output.category === 'insufficient_data' || output.severity === 'insufficient_data';
}

/**
 * Sort rank for one row: off-ladder rows rank last, everything else by severity tier.
 * Reading `category` as well as `severity` is what makes the two shapes above order
 * IDENTICALLY — before CF-30 a sentinel-shaped row sorted last (unknown rank) while a
 * contract-shaped one sorted as `info` (rank 2), which is the ordering divergence CF-30
 * recorded.
 */
function diagnosticPriorityRank(
  output: Pick<Tables<'diagnostic_outputs'>, 'category' | 'severity'>,
): number {
  if (isInsufficientData(output)) return OFF_LADDER_RANK;
  return SEVERITY_RANK[output.severity] ?? UNKNOWN_SEVERITY_RANK;
}

/**
 * Order diagnostics for the preview: by severity (critical → warning → info →
 * off-ladder/unknown), then most-recent `generated_at` first within each tier.
 *
 * Returns a NEW array (does not mutate the input). An unparseable `generated_at`
 * is treated as oldest so a malformed row never jumps to the top of its tier.
 */
export function sortDiagnosticsByPriority(
  diagnostics: readonly Tables<'diagnostic_outputs'>[],
): Tables<'diagnostic_outputs'>[] {
  return [...diagnostics].sort((a, b) => {
    const bySeverity = diagnosticPriorityRank(a) - diagnosticPriorityRank(b);
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
 *   1. {@link isInsufficientData} — `insufficient_data` in EITHER `category` OR
 *      `severity` → `'insufficient_data'` (OFF the ladder, §4.3). Unchanged by CF-30:
 *      the either-field check stays deliberately defensive even though the fixtures are
 *      now contract-shaped (see that helper for why). It wins over whatever else is
 *      stamped.
 *   2. otherwise, map `severity` on the ladder, defaulting to {@link DEFAULT_CARD_STATE}
 *      for an unrecognised value (never throws).
 */
export function deriveDiagnosticCardState(
  output: Pick<Tables<'diagnostic_outputs'>, 'category' | 'severity'>,
): DiagnosticCardState {
  if (isInsufficientData(output)) return 'insufficient_data';
  return CARD_STATE_BY_SEVERITY[output.severity] ?? DEFAULT_CARD_STATE;
}

/**
 * Which of contract §7's two "I don't know"s a row is:
 *   • `'temporary'`  — not enough history yet; resolves with more driving.
 *   • `'permanent'`  — the car cannot report the metric; never resolves.
 *   • `'unknown'`    — indistinguishable on the row (today, always).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE SINGLE EDIT POINT for contract §7's **DECISION REQUIRED #3**.
 *
 * It returns `'unknown'` UNCONDITIONALLY, and that is the honest answer, not a stub:
 * both cases are written as `category='insufficient_data'`, `severity='info'`,
 * `urgency='monitor'`, `confidence<0.3`, so **nothing on the row distinguishes them**.
 * The agent project has not yet chosen between §7's option (a) a convention on
 * `title`/`explanation` and (b) a small structured marker.
 *
 * It deliberately does NOT string-match `title` or `explanation`. That would look like a
 * working discriminator while silently guessing: the agent's copy is free prose that
 * changes per agent version, so any keyword rule would drift into confidently telling a
 * driver "keep driving, we'll have more soon" about a metric their ECU will never report
 * — the exact lie §7 says the split exists to prevent. Guessing wrong here is worse than
 * saying "unknown".
 *
 * WHEN THE DECISION LANDS: if (b), read the new marker column here and nothing else in
 * the app changes. If (a), this is still the one place the convention gets encoded — put
 * it here rather than at any call site. Callers must already handle `'unknown'`, so
 * neither outcome is a breaking change. See CF-30.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Pure; never throws. The parameter is currently unread (hence the underscore) — it is
 * part of the signature so the eventual discriminator has somewhere to go without every
 * call site changing.
 */
export type InsufficientDataKind = 'temporary' | 'permanent' | 'unknown';

export function deriveInsufficientDataKind(
  _output: Pick<Tables<'diagnostic_outputs'>, 'category' | 'severity' | 'title' | 'explanation'>,
): InsufficientDataKind {
  return 'unknown';
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

// ─── Diagnostics feed (design §6 S1) ─────────────────────────────────────────
// Two pure rules the S1 feed composes: dedup first (collapse repeats), then date
// grouping (lay the survivors out by day). Both are screen-agnostic and tested
// without rendering anything — the screen lands separately.

/**
 * The one `diagnostic_outputs.status` that means the user has taken a row OUT of the feed.
 * Every other status leaves it active — see {@link isDiagnosticActive}.
 */
const DISMISSED_STATUS = 'dismissed';

/**
 * Whether a diagnostic is in an ACTIVE state — the second half of the dedup key.
 *
 * Of the contract's four statuses, `dismissed` is the only inactive one: it is the only
 * one the USER sets to mean "take this out of my feed". `new` and `seen` are obviously
 * active; `actioned` is the non-obvious one and it IS active — it is not a "resolved"
 * marker but what the critical card's "I've got it" acknowledgement writes (see
 * `data/diagnosticActions.ts`), i.e. the critical equivalent of `seen`. Treating it as
 * inactive would let acknowledging a critical finding silently un-suppress an older
 * repeat of the same category.
 *
 * Expressed as "not dismissed" rather than "one of new/seen/actioned" so an unrecognised
 * `status` from a future agent/app version degrades to VISIBLE rather than vanishing from
 * the feed. Same degrade-to-visible policy `groupDtcs` takes on an off-union `grouping`
 * (lib/dtc.ts). `status` is a plain `text` column on this side of the seam.
 */
export function isDiagnosticActive(
  output: Pick<Tables<'diagnostic_outputs'>, 'status'>,
): boolean {
  return output.status !== DISMISSED_STATUS;
}

/**
 * Collapse repeat diagnostics for the S1 feed.
 *
 * IMPLEMENTS **contract §5, "Dedup (v0.1 Q5, confirmed)"**: *"the agent writes one row
 * per occurrence and uses prior outputs as continuity context…; the **app** dedupes in
 * the UI by category + active state. The agent does not suppress repeats."* This is the
 * app-side half of that sentence, and the ONLY place the rule lives.
 *
 * The key is the PAIR `(category, isDiagnosticActive)`, not category alone. That
 * distinction is the whole reason the contract names both halves: a dismissed occurrence
 * and a live one in the same category land in different buckets, so
 *   • dismissing an old row can never hide a new active row in that category, and
 *   • a new active row can never resurrect a row the user dismissed.
 * A category holding both therefore yields TWO rows, which is correct, not a miss.
 *
 * The survivor of each bucket is the NEWEST by `generated_at`. That follows from the same
 * contract sentence: the agent treats prior outputs as continuity context and does not
 * contradict a recent one, so the latest row for a category IS the current assessment
 * rather than merely the latest sample of it.
 *
 * Dedup only — it never FILTERS. Hiding dismissed rows (or any status) is the caller's
 * choice, expressed through `fetchDiagnostics`'s `status` filter, and keeping the two
 * concerns apart is what lets a "Dismissed" filter chip work at all.
 *
 * Pure: returns a NEW array, does not mutate the input, never throws.
 * Output order is the INPUT order of the surviving rows — this function imposes no
 * ordering of its own, so a newest-first input stays newest-first and the caller stays
 * free to run {@link sortDiagnosticsByPriority} instead. Ties on `generated_at` (and
 * unparseable values, treated as oldest exactly as in {@link sortDiagnosticsByPriority})
 * resolve to the FIRST row seen, so the result is deterministic for any input.
 */
export function dedupeDiagnostics(
  diagnostics: readonly Tables<'diagnostic_outputs'>[],
): Tables<'diagnostic_outputs'>[] {
  /**
   * Bucket key. A two-element JSON array rather than a joined string: with no separator
   * there is no separator a `category` value could itself contain, so two different
   * (category, active) pairs can never collide on one key.
   */
  const keyOf = (d: Tables<'diagnostic_outputs'>): string =>
    JSON.stringify([d.category, isDiagnosticActive(d)]);

  const timeOf = (d: Tables<'diagnostic_outputs'>): number => {
    const ms = Date.parse(d.generated_at);
    return Number.isNaN(ms) ? -Infinity : ms;
  };

  // First pass: the winning row per bucket, remembered by POSITION rather than by row
  // reference. Positions are unique, so an input that happens to contain the same row
  // object twice still collapses to one — a set of references would emit it twice.
  // Strictly-greater keeps the FIRST row on a tie, which is what makes the result stable.
  const winners = new Map<string, { index: number; time: number }>();
  diagnostics.forEach((d, index) => {
    const key = keyOf(d);
    const time = timeOf(d);
    const incumbent = winners.get(key);
    if (incumbent === undefined || time > incumbent.time) winners.set(key, { index, time });
  });

  // Second pass: emit in input order. A Map iterates in insertion order, which is
  // first-SEEN order per bucket, not the surviving row's position — hence the index set.
  const keep = new Set([...winners.values()].map((w) => w.index));
  return diagnostics.filter((_row, index) => keep.has(index));
}

/**
 * One day's worth of diagnostics in the S1 feed. `dateKey` is the sortable
 * 'YYYY-MM-DD'; `label` is the rendered heading ("22 Jun 2026").
 */
export interface DiagnosticDateGroup {
  dateKey: string;
  label: string;
  diagnostics: Tables<'diagnostic_outputs'>[];
}

/**
 * UTC calendar-date key ('YYYY-MM-DD') for a diagnostic's `generated_at`. ISO-8601
 * timestamps start with exactly this, so the slice is the UTC date with no parsing.
 *
 * UTC, not device-local, to match `driveDateKey` — the two feeds must not disagree about
 * which day a drive and the diagnostic generated from it belong to. Carries the same
 * TODO(local-tz) as `lib/drives.ts`: group by the driver's local date once the data
 * carries a real timezone/offset, and change BOTH together.
 */
export function diagnosticDateKey(generatedAt: string): string {
  return generatedAt.slice(0, 10);
}

/**
 * Group diagnostics into date sections for the S1 feed (design §6: "severity filter chips
 * + **date-grouped** Diagnostic Card instances").
 *
 * Groups by UTC calendar date via {@link diagnosticDateKey}, and — unlike
 * `buildDriveListItems`, which assumes its input is already ordered — this SORTS: date
 * groups come back newest-day-first and rows within a day newest-first, so the feed is
 * correct even when the caller has run {@link dedupeDiagnostics} (which preserves input
 * order) or applied filters that disturb ordering. Sorting here rather than trusting the
 * caller is what keeps the two rules composable in either order.
 *
 * Rows with an unparseable/short `generated_at` still group (on whatever prefix they
 * carry) rather than being dropped — a malformed row is visible, never silently missing.
 *
 * Returns groups rather than a flat header/row array (the shape `buildDriveListItems`
 * produces for S3's FlatList): S1 has not been built yet, so flattening is left to the
 * screen, which can feed a SectionList directly or interleave headers itself.
 *
 * Pure: does not mutate the input array or any row.
 */
export function groupDiagnosticsByDate(
  diagnostics: readonly Tables<'diagnostic_outputs'>[],
): DiagnosticDateGroup[] {
  const byKey = new Map<string, Tables<'diagnostic_outputs'>[]>();

  for (const d of diagnostics) {
    const key = diagnosticDateKey(d.generated_at);
    const bucket = byKey.get(key);
    if (bucket === undefined) byKey.set(key, [d]);
    else bucket.push(d);
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // newest day first
    .map(([dateKey, rows]) => ({
      dateKey,
      // The app's one English date-heading formatter. It lives in `drives.ts` only
      // because S3 needed it first — shared here rather than duplicated; promoting it to
      // a `lib/date.ts` is a mechanical follow-up, not this PR's business.
      label: formatDriveDateHeading(dateKey),
      diagnostics: [...rows].sort((x, y) => y.generated_at.localeCompare(x.generated_at)),
    }));
}
