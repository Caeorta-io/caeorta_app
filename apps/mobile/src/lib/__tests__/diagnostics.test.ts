import { describe, expect, it } from 'vitest';
import type { Tables } from '@caeorta/supabase';

import {
  dedupeDiagnostics,
  deriveDiagnosticCardState,
  deriveInsufficientDataKind,
  diagnosticDateKey,
  findDiagnosticForDtc,
  groupDiagnosticsByDate,
  isDiagnosticActive,
  isInsufficientData,
  sortDiagnosticsByPriority,
  usesCriticalAcknowledgeLabel,
} from '../diagnostics';
import {
  allMockDiagnostics,
  mockDiagnostics,
  mockDtcs,
  mockOlderDiagnostics,
  mockOtherDriveDiagnostics,
  MOCK_LINKED_DTC_ID,
} from '../data/mocks';

// Build a diagnostic by overriding a real fixture, so every required column is
// present without restating the whole row.
type Diagnostic = Tables<'diagnostic_outputs'>;
const base = mockDiagnostics[2] as Diagnostic; // the 'info' fixture
const make = (id: string, severity: string, generated_at: string): Diagnostic => ({
  ...base,
  id,
  severity,
  generated_at,
});

describe('sortDiagnosticsByPriority', () => {
  it('surfaces critical before warning before info, regardless of input order', () => {
    const input = [
      make('i', 'info', '2026-06-22T07:00:00.000Z'),
      make('c', 'critical', '2026-06-22T07:00:00.000Z'),
      make('w', 'warning', '2026-06-22T07:00:00.000Z'),
    ];
    expect(sortDiagnosticsByPriority(input).map((d) => d.severity)).toEqual([
      'critical',
      'warning',
      'info',
    ]);
  });

  it('orders most-recent generated_at first within a severity tier', () => {
    const older = make('c-old', 'critical', '2026-06-22T07:00:00.000Z');
    const newer = make('c-new', 'critical', '2026-06-22T09:00:00.000Z');
    expect(sortDiagnosticsByPriority([older, newer]).map((d) => d.id)).toEqual(['c-new', 'c-old']);
  });

  it('combines both rules: severity tier wins, recency breaks ties within a tier', () => {
    const input = [
      make('w', 'warning', '2026-06-22T09:00:00.000Z'),
      make('c-old', 'critical', '2026-06-22T07:00:00.000Z'),
      make('c-new', 'critical', '2026-06-22T08:00:00.000Z'),
    ];
    expect(sortDiagnosticsByPriority(input).map((d) => d.id)).toEqual(['c-new', 'c-old', 'w']);
  });

  it('sorts unknown severities after the known tiers', () => {
    const input = [
      make('x', 'catastrophic', '2026-06-22T09:00:00.000Z'),
      make('i', 'info', '2026-06-22T07:00:00.000Z'),
    ];
    expect(sortDiagnosticsByPriority(input).map((d) => d.severity)).toEqual([
      'info',
      'catastrophic',
    ]);
  });

  it('returns an empty array for empty input (the preview shows its empty state)', () => {
    expect(sortDiagnosticsByPriority([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [
      make('i', 'info', '2026-06-22T07:00:00.000Z'),
      make('c', 'critical', '2026-06-22T07:00:00.000Z'),
    ];
    const snapshot = input.map((d) => d.id);
    sortDiagnosticsByPriority(input);
    expect(input.map((d) => d.id)).toEqual(snapshot);
  });

  it('keeps the seeded fixtures critical → warning → info', () => {
    expect(sortDiagnosticsByPriority(mockDiagnostics).map((d) => d.severity)).toEqual([
      'critical',
      'warning',
      'info',
    ]);
  });
});

// CF-30's actual remaining exposure: before this PR, `sortDiagnosticsByPriority` keyed on
// `severity` ALONE, so the two ways of expressing "insufficient data" ordered differently
// — the sentinel sorted last (unknown rank) while a contract-shaped row sorted as `info`
// (rank 2). The card helper already recognised both. These pin the reconciliation.
describe('sortDiagnosticsByPriority — insufficient_data shape parity (CF-30)', () => {
  const CONTRACT_SHAPE = { category: 'insufficient_data', severity: 'info' };
  const SENTINEL_SHAPE = { category: 'engine', severity: 'insufficient_data' };

  /**
   * Four rows that differ ONLY in how the insufficient-data row is stamped. Its
   * `generated_at` is the NEWEST of the set on purpose: ranked as `info` it would sort
   * ahead of the real `info` row, so a regression to severity-only ranking shows up as an
   * order change rather than passing by luck.
   */
  const rows = (shape: { category: string; severity: string }): Diagnostic[] => [
    { ...base, id: 'info', category: 'engine', severity: 'info', generated_at: '2026-06-22T07:00:00.000Z' },
    { ...base, id: 'insufficient', ...shape, generated_at: '2026-06-22T09:00:00.000Z' },
    { ...base, id: 'critical', category: 'turbo', severity: 'critical', generated_at: '2026-06-22T06:00:00.000Z' },
    { ...base, id: 'warning', category: 'cooling', severity: 'warning', generated_at: '2026-06-22T08:00:00.000Z' },
  ];

  it('orders the contract shape and the sentinel shape identically', () => {
    expect(sortDiagnosticsByPriority(rows(CONTRACT_SHAPE)).map((d) => d.id)).toEqual(
      sortDiagnosticsByPriority(rows(SENTINEL_SHAPE)).map((d) => d.id),
    );
  });

  it('sorts insufficient_data below info in BOTH shapes (off the ladder, not the quietest rung)', () => {
    for (const shape of [CONTRACT_SHAPE, SENTINEL_SHAPE]) {
      expect(sortDiagnosticsByPriority(rows(shape)).map((d) => d.id)).toEqual([
        'critical',
        'warning',
        'info',
        'insufficient',
      ]);
    }
  });

  it('agrees with the card helper about what is off the ladder', () => {
    // The two must never disagree — they share `isInsufficientData` for exactly this reason.
    for (const shape of [CONTRACT_SHAPE, SENTINEL_SHAPE]) {
      const row = { ...base, ...shape };
      expect(isInsufficientData(row)).toBe(true);
      expect(deriveDiagnosticCardState(row)).toBe('insufficient_data');
      expect(sortDiagnosticsByPriority([...rows(shape)]).at(-1)?.id).toBe('insufficient');
    }
    expect(isInsufficientData({ ...base, category: 'engine', severity: 'info' })).toBe(false);
  });
});

// Build a card-state input by overriding a real fixture, so `category` + `severity`
// are always a coherent pair unless the test deliberately mismatches them.
const cardBase = mockDiagnostics[2] as Diagnostic; // the 'info' / 'engine' fixture
const withState = (category: string, severity: string): Pick<Diagnostic, 'category' | 'severity'> => ({
  ...cardBase,
  category,
  severity,
});

describe('deriveDiagnosticCardState', () => {
  it('maps each on-ladder severity to its state', () => {
    expect(deriveDiagnosticCardState(withState('engine', 'info'))).toBe('info');
    expect(deriveDiagnosticCardState(withState('cooling', 'warning'))).toBe('warning');
    expect(deriveDiagnosticCardState(withState('turbo', 'critical'))).toBe('critical');
  });

  it("returns 'insufficient_data' when the CATEGORY is insufficient_data (contract shape)", () => {
    // docs/06 "I don't know" path: category='insufficient_data', severity='info'.
    expect(deriveDiagnosticCardState(withState('insufficient_data', 'info'))).toBe(
      'insufficient_data',
    );
  });

  it("returns 'insufficient_data' when the SEVERITY says so (defensive, not a shape we emit)", () => {
    // CHANGED IN CF-30, DELIBERATELY — the ASSERTION is unchanged (the either-field check
    // is kept on purpose); what changed is what it means. It used to document the app's
    // own sentinel shape, which the fixtures really used. They are contract-shaped now, so
    // this no longer describes any row this repo produces: it is purely a guard on an
    // unvalidated live row, where `severity` is plain `text` on our side of the seam. The
    // worst case it buys is a correctly-neutral card instead of a false severity colour.
    expect(deriveDiagnosticCardState(withState('engine', 'insufficient_data'))).toBe(
      'insufficient_data',
    );
  });

  it('lets insufficient_data (either field) win over a higher severity/category', () => {
    // Off-ladder must never be pulled back onto the ladder by the other field.
    expect(deriveDiagnosticCardState(withState('insufficient_data', 'critical'))).toBe(
      'insufficient_data',
    );
    expect(deriveDiagnosticCardState(withState('turbo', 'insufficient_data'))).toBe(
      'insufficient_data',
    );
  });

  it('falls back to info for an unrecognised severity (never throws)', () => {
    expect(deriveDiagnosticCardState(withState('engine', 'catastrophic'))).toBe('info');
    expect(deriveDiagnosticCardState(withState('engine', ''))).toBe('info');
  });

  it('derives the four states from the real fixtures', () => {
    expect(deriveDiagnosticCardState(mockDiagnostics[0] as Diagnostic)).toBe('critical');
    expect(deriveDiagnosticCardState(mockDiagnostics[1] as Diagnostic)).toBe('warning');
    expect(deriveDiagnosticCardState(mockDiagnostics[2] as Diagnostic)).toBe('info');
    // …671 is warning; …672 is the insufficient_data fixture.
    expect(deriveDiagnosticCardState(mockOtherDriveDiagnostics[1] as Diagnostic)).toBe(
      'insufficient_data',
    );
  });
});

describe('usesCriticalAcknowledgeLabel', () => {
  it('is true only for the critical state', () => {
    expect(usesCriticalAcknowledgeLabel('critical')).toBe(true);
    expect(usesCriticalAcknowledgeLabel('warning')).toBe(false);
    expect(usesCriticalAcknowledgeLabel('info')).toBe(false);
    expect(usesCriticalAcknowledgeLabel('insufficient_data')).toBe(false);
  });
});

describe('deriveInsufficientDataKind (contract §7 DECISION REQUIRED #3)', () => {
  it("returns 'unknown' for every row — nothing on the row distinguishes the two cases", () => {
    for (const row of allMockDiagnostics) {
      expect(deriveInsufficientDataKind(row)).toBe('unknown');
    }
  });

  // THE point of this test: it locks the decision NOT to string-match. Both fixtures below
  // are real ones whose prose says, in plain English, which case they are — …672 "more data
  // is needed / a longer drive will give a clearer picture" (temporary) and …676 "will not
  // change with more driving … a limit of what the ECU exposes" (permanent). A keyword rule
  // would pass here and then quietly mislabel the next agent version's wording. Until the
  // agent marks the difference structurally, 'unknown' is the only honest answer.
  it('stays unknown even when the title/explanation plainly imply the case', () => {
    const temporary = mockOtherDriveDiagnostics[1] as Diagnostic;
    const permanent = mockOlderDiagnostics[3] as Diagnostic;

    expect(temporary.category).toBe('insufficient_data');
    expect(permanent.category).toBe('insufficient_data');
    expect(temporary.explanation).toMatch(/more data is needed/i);
    expect(permanent.explanation).toMatch(/will not change with more driving/i);

    expect(deriveInsufficientDataKind(temporary)).toBe('unknown');
    expect(deriveInsufficientDataKind(permanent)).toBe('unknown');
  });
});

describe('isDiagnosticActive', () => {
  it('treats every status except dismissed as active', () => {
    for (const status of ['new', 'seen', 'actioned']) {
      expect(isDiagnosticActive({ ...base, status })).toBe(true);
    }
    expect(isDiagnosticActive({ ...base, status: 'dismissed' })).toBe(false);
  });

  it("keeps 'actioned' active — it is the critical acknowledge, not a resolution", () => {
    // DiagnosticCard writes 'actioned' for "I've got it" (data/diagnosticActions.ts). If
    // that counted as inactive, acknowledging a critical would move it to the other dedup
    // bucket and un-suppress an older repeat of the same category.
    expect(isDiagnosticActive({ ...base, status: 'actioned' })).toBe(true);
  });

  it('degrades an unrecognised status to VISIBLE rather than hiding the row', () => {
    expect(isDiagnosticActive({ ...base, status: 'escalated' })).toBe(true);
    expect(isDiagnosticActive({ ...base, status: '' })).toBe(true);
  });
});

describe('dedupeDiagnostics (contract §5: category + active state)', () => {
  /** Compact row builder — only the four fields the dedup rule reads ever vary. */
  const row = (id: string, category: string, status: string, generated_at: string): Diagnostic => ({
    ...base,
    id,
    category,
    status,
    generated_at,
  });

  it('collapses same-category active repeats to the newest row', () => {
    const input = [
      row('old', 'cooling', 'new', '2026-06-20T10:00:00.000Z'),
      row('newest', 'cooling', 'new', '2026-06-22T10:00:00.000Z'),
      row('middle', 'cooling', 'seen', '2026-06-21T10:00:00.000Z'),
    ];
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['newest']);
  });

  it('keeps categories independent of one another', () => {
    const input = [
      row('a', 'cooling', 'new', '2026-06-22T10:00:00.000Z'),
      row('b', 'turbo', 'new', '2026-06-21T10:00:00.000Z'),
      row('c', 'fuel', 'new', '2026-06-20T10:00:00.000Z'),
    ];
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['a', 'b', 'c']);
  });

  // The case the active-state half of the key exists for.
  it('keeps an active AND a dismissed row of the same category — two rows, not one', () => {
    const input = [
      row('active', 'fuel', 'new', '2026-06-22T10:00:00.000Z'),
      row('dismissed', 'fuel', 'dismissed', '2026-06-21T10:00:00.000Z'),
    ];
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['active', 'dismissed']);
  });

  it('a dismissed row never suppresses a NEWER active one, whichever order they arrive in', () => {
    // The direction that actually matters: if the key were category alone, the newest row
    // would win outright and a dismissal would swallow the live finding behind it.
    const input = [
      row('dismissed-newer', 'fuel', 'dismissed', '2026-06-22T10:00:00.000Z'),
      row('active-older', 'fuel', 'new', '2026-06-21T10:00:00.000Z'),
    ];
    const ids = dedupeDiagnostics(input).map((d) => d.id);
    expect(ids).toContain('active-older');
    expect(ids).toContain('dismissed-newer');
  });

  it('collapses new / seen / actioned together as one active bucket', () => {
    const input = [
      row('new', 'engine', 'new', '2026-06-20T10:00:00.000Z'),
      row('seen', 'engine', 'seen', '2026-06-21T10:00:00.000Z'),
      row('actioned', 'engine', 'actioned', '2026-06-22T10:00:00.000Z'),
    ];
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['actioned']);
  });

  it('collapses multiple dismissed rows of a category to the newest dismissed one', () => {
    const input = [
      row('d-old', 'fuel', 'dismissed', '2026-06-20T10:00:00.000Z'),
      row('d-new', 'fuel', 'dismissed', '2026-06-22T10:00:00.000Z'),
    ];
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['d-new']);
  });

  it('emits survivors in INPUT order, imposing no ordering of its own', () => {
    // Deliberately oldest-first input: the result must stay oldest-first, so a caller can
    // dedupe before or after sorting without the two rules fighting.
    const input = [
      row('fuel-old', 'fuel', 'new', '2026-06-18T10:00:00.000Z'),
      row('turbo', 'turbo', 'new', '2026-06-19T10:00:00.000Z'),
      row('fuel-new', 'fuel', 'new', '2026-06-22T10:00:00.000Z'),
      row('engine', 'engine', 'new', '2026-06-21T10:00:00.000Z'),
    ];
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['turbo', 'fuel-new', 'engine']);
  });

  it('resolves a generated_at tie to the first row seen (deterministic)', () => {
    const at = '2026-06-22T10:00:00.000Z';
    const input = [row('first', 'fuel', 'new', at), row('second', 'fuel', 'new', at)];
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['first']);
    expect(dedupeDiagnostics([...input].reverse()).map((d) => d.id)).toEqual(['second']);
  });

  it('treats an unparseable generated_at as oldest, and never throws', () => {
    const input = [
      row('broken', 'fuel', 'new', 'not-a-timestamp'),
      row('real', 'fuel', 'new', '2026-06-22T10:00:00.000Z'),
    ];
    expect(() => dedupeDiagnostics(input)).not.toThrow();
    expect(dedupeDiagnostics(input).map((d) => d.id)).toEqual(['real']);
    // A lone malformed row still survives — it is the only occupant of its bucket.
    expect(dedupeDiagnostics([input[0] as Diagnostic]).map((d) => d.id)).toEqual(['broken']);
  });

  it('returns an empty array for empty input and does not mutate the input', () => {
    expect(dedupeDiagnostics([])).toEqual([]);
    const input = [
      row('a', 'fuel', 'new', '2026-06-22T10:00:00.000Z'),
      row('b', 'fuel', 'new', '2026-06-21T10:00:00.000Z'),
    ];
    const snapshot = input.map((d) => d.id);
    dedupeDiagnostics(input);
    expect(input.map((d) => d.id)).toEqual(snapshot);
  });

  it('collapses the SAME row object appearing twice in the input', () => {
    // Identity-based bookkeeping would emit this row twice, which is the one thing a
    // dedup function must never do.
    const only = row('only', 'fuel', 'new', '2026-06-22T10:00:00.000Z');
    expect(dedupeDiagnostics([only, only]).map((d) => d.id)).toEqual(['only']);
  });

  it('is idempotent — deduping an already-deduped list changes nothing', () => {
    const once = dedupeDiagnostics(allMockDiagnostics);
    expect(dedupeDiagnostics(once)).toEqual(once);
  });

  it('collapses the real fixture set exactly as the rule predicts', () => {
    const deduped = dedupeDiagnostics(allMockDiagnostics);
    // One row per (category, active-state) pair present in the fixtures.
    const keys = deduped.map((d) => `${d.category}/${isDiagnosticActive(d) ? 'active' : 'inactive'}`);
    expect(new Set(keys).size).toBe(keys.length);

    // `fuel` has two active rows and one dismissed → exactly two survive, one of each state.
    const fuel = deduped.filter((d) => d.category === 'fuel');
    expect(fuel.map((d) => d.id).sort()).toEqual([
      '66666666-6666-4666-8666-666666666673', // newest active
      '66666666-6666-4666-8666-666666666675', // the dismissed one
    ]);

    // The two active insufficient_data rows collapse to the newer (…672).
    const insufficient = deduped.filter((d) => d.category === 'insufficient_data');
    expect(insufficient.map((d) => d.id)).toEqual(['66666666-6666-4666-8666-666666666672']);
  });
});

describe('groupDiagnosticsByDate (design §6 S1)', () => {
  const at = (id: string, generated_at: string): Diagnostic => ({ ...base, id, generated_at });

  it('groups by UTC calendar date, newest day first', () => {
    const groups = groupDiagnosticsByDate([
      at('a', '2026-06-18T06:00:00.000Z'),
      at('b', '2026-06-22T06:00:00.000Z'),
      at('c', '2026-06-21T06:00:00.000Z'),
    ]);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-06-22', '2026-06-21', '2026-06-18']);
  });

  it('orders rows newest-first WITHIN a day, whatever order they arrive in', () => {
    const groups = groupDiagnosticsByDate([
      at('morning', '2026-06-22T06:00:00.000Z'),
      at('evening', '2026-06-22T21:00:00.000Z'),
      at('midday', '2026-06-22T12:00:00.000Z'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.diagnostics.map((d) => d.id)).toEqual(['evening', 'midday', 'morning']);
  });

  it('carries a rendered heading label alongside the sortable key', () => {
    const groups = groupDiagnosticsByDate([at('a', '2026-06-22T06:00:00.000Z')]);
    expect(groups[0]?.label).toBe('22 Jun 2026');
  });

  it('puts every input row in exactly one group, losing none', () => {
    const groups = groupDiagnosticsByDate(allMockDiagnostics);
    const total = groups.reduce((n, g) => n + g.diagnostics.length, 0);
    expect(total).toBe(allMockDiagnostics.length);
    const ids = groups.flatMap((g) => g.diagnostics.map((d) => d.id));
    expect(new Set(ids).size).toBe(allMockDiagnostics.length);
  });

  it('keeps a malformed generated_at VISIBLE in its own group rather than dropping it', () => {
    const groups = groupDiagnosticsByDate([at('broken', 'not-a-timestamp'), at('ok', '2026-06-22T06:00:00.000Z')]);
    const ids = groups.flatMap((g) => g.diagnostics.map((d) => d.id));
    expect(ids).toContain('broken');
    expect(ids).toContain('ok');
  });

  it('returns an empty array for empty input and does not mutate the input', () => {
    expect(groupDiagnosticsByDate([])).toEqual([]);
    const input = [at('a', '2026-06-18T06:00:00.000Z'), at('b', '2026-06-22T06:00:00.000Z')];
    const snapshot = input.map((d) => d.id);
    groupDiagnosticsByDate(input);
    expect(input.map((d) => d.id)).toEqual(snapshot);
  });

  it('composes with dedupeDiagnostics in either order, giving the same feed', () => {
    // S1 will dedupe then group; the two rules must not depend on that sequencing.
    const dedupeThenGroup = groupDiagnosticsByDate(dedupeDiagnostics(allMockDiagnostics));
    const survivors = new Set(dedupeDiagnostics(allMockDiagnostics).map((d) => d.id));
    const groupThenDedupe = groupDiagnosticsByDate(allMockDiagnostics)
      .map((g) => ({ ...g, diagnostics: g.diagnostics.filter((d) => survivors.has(d.id)) }))
      .filter((g) => g.diagnostics.length > 0);
    expect(dedupeThenGroup).toEqual(groupThenDedupe);
  });

  it('the fixtures give the feed real depth: several dates, and days with more than one row', () => {
    // Without this the Day-2 screen would be built against a feed that cannot show
    // multi-row days or a date boundary.
    const groups = groupDiagnosticsByDate(allMockDiagnostics);
    expect(groups.length).toBeGreaterThanOrEqual(3);
    expect(groups.some((g) => g.diagnostics.length > 1)).toBe(true);
    expect(groups.some((g) => g.diagnostics.length === 1)).toBe(true);
  });
});

describe('diagnosticDateKey', () => {
  it('is the UTC calendar date, matching driveDateKey so the two feeds agree', () => {
    expect(diagnosticDateKey('2026-06-22T23:59:59.000Z')).toBe('2026-06-22');
    expect(diagnosticDateKey('2026-06-23T00:00:01.000Z')).toBe('2026-06-23');
  });
});

describe('findDiagnosticForDtc (S6 related card)', () => {
  /** Field-level override of the same real fixture {@link make} builds from. */
  const diagnostic = (fields: Partial<Diagnostic>): Diagnostic => ({ ...base, ...fields });

  it('resolves the one linked fixture', () => {
    const found = findDiagnosticForDtc(allMockDiagnostics, MOCK_LINKED_DTC_ID);
    expect(found).not.toBeNull();
    expect(found?.referenced_dtc_ids).toContain(MOCK_LINKED_DTC_ID);
  });

  it('returns null for a real DTC that nothing references', () => {
    // The ordinary case: only one fixture carries a link, so every other code has none.
    const unlinked = mockDtcs.filter((d) => d.id !== MOCK_LINKED_DTC_ID);
    expect(unlinked.length).toBeGreaterThan(0);
    for (const dtc of unlinked) {
      expect(findDiagnosticForDtc(allMockDiagnostics, dtc.id)).toBeNull();
    }
  });

  it('keeps the link set to exactly one — the fixture contract S6 verification rests on', () => {
    const linked = allMockDiagnostics.filter((d) => d.referenced_dtc_ids.length > 0);
    expect(linked).toHaveLength(1);
    expect(linked[0]?.referenced_dtc_ids).toEqual([MOCK_LINKED_DTC_ID]);
  });

  it('picks the highest-priority row when several diagnostics cite the same code', () => {
    // §6 shows ONE card, so a multi-citation must resolve deterministically: severity
    // first, then recency — the same order sortDiagnosticsByPriority applies everywhere.
    const dtcId = 'shared-code';
    const info = diagnostic({ id: 'a', severity: 'info', referenced_dtc_ids: [dtcId] });
    const critical = diagnostic({ id: 'b', severity: 'critical', referenced_dtc_ids: [dtcId] });
    expect(findDiagnosticForDtc([info, critical], dtcId)?.id).toBe('b');
    expect(findDiagnosticForDtc([critical, info], dtcId)?.id).toBe('b');
  });

  it('never throws on empty, blank or malformed input', () => {
    const malformed = [
      diagnostic({ id: 'no-array', referenced_dtc_ids: null as unknown as string[] }),
      diagnostic({ id: 'undef', referenced_dtc_ids: undefined as unknown as string[] }),
      diagnostic({ id: 'not-array', referenced_dtc_ids: 'nope' as unknown as string[] }),
    ];
    for (const dtcId of ['', '   ', 'unknown-id', MOCK_LINKED_DTC_ID]) {
      expect(() => findDiagnosticForDtc(malformed, dtcId)).not.toThrow();
      expect(findDiagnosticForDtc(malformed, dtcId)).toBeNull();
    }
    expect(findDiagnosticForDtc([], MOCK_LINKED_DTC_ID)).toBeNull();
    // A blank id must never match, even against rows that do carry links.
    expect(findDiagnosticForDtc(allMockDiagnostics, '')).toBeNull();
    expect(findDiagnosticForDtc(allMockDiagnostics, '  ')).toBeNull();
  });

  it('does not mutate the input array', () => {
    const input = [...allMockDiagnostics];
    const before = input.map((d) => d.id);
    findDiagnosticForDtc(input, MOCK_LINKED_DTC_ID);
    expect(input.map((d) => d.id)).toEqual(before);
  });
});
