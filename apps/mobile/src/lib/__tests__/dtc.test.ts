import { describe, expect, it } from 'vitest';
import { DTC_GROUPINGS, type Dtc, type DtcGrouping } from '@caeorta/types';

import {
  deriveDtcBadgeSeverity,
  groupDtcs,
  parseFreezeFrameMetrics,
  toFreezeFrameTiles,
} from '../dtc';
import { dtcTitle, hasPlainLanguageTitle } from '../dtcTitles';
import {
  DEV_DTC_FIXTURE_VEHICLE_IDS,
  dtcsForVehicle,
  mockDtcs,
  MOCK_VEHICLE_ID,
} from '../data/mocks';

describe('deriveDtcBadgeSeverity', () => {
  it('maps the known severity_raw values onto the §4.3 ladder', () => {
    expect(deriveDtcBadgeSeverity('critical')).toBe('critical');
    expect(deriveDtcBadgeSeverity('warning')).toBe('warning');
    expect(deriveDtcBadgeSeverity('warn')).toBe('warning');
    expect(deriveDtcBadgeSeverity('info')).toBe('info');
  });

  it('normalises casing and surrounding whitespace', () => {
    // The fixtures deliberately drift ('WARN', 'INFO') because severity_raw is free
    // ECU text with no CHECK constraint — see the TODO(dtc-severity-vocab) note.
    expect(deriveDtcBadgeSeverity('WARN')).toBe('warning');
    expect(deriveDtcBadgeSeverity('INFO')).toBe('info');
    expect(deriveDtcBadgeSeverity('  Critical  ')).toBe('critical');
  });

  it('falls through to the neutral unknown badge for an unrecognised value', () => {
    // Never mis-tints: an unreadable severity must not be asserted as a real tier.
    for (const raw of ['severe', 'high', 'P0299', 'moderate', 'critical-ish', '0']) {
      expect(deriveDtcBadgeSeverity(raw)).toBe('unknown');
    }
  });

  it('treats null / undefined / blank as unknown, not as info', () => {
    expect(deriveDtcBadgeSeverity(null)).toBe('unknown');
    expect(deriveDtcBadgeSeverity(undefined)).toBe('unknown');
    expect(deriveDtcBadgeSeverity('')).toBe('unknown');
    expect(deriveDtcBadgeSeverity('   ')).toBe('unknown');
  });

  it('never throws, including on non-string input from an unvalidated live row', () => {
    // `toDtc` spreads the row rather than zod-parsing every scalar, so a PostgREST
    // row could carry anything here. Degrade, don't crash.
    const hostile: unknown[] = [42, true, {}, [], Symbol('x'), () => 'critical'];
    for (const value of hostile) {
      // Deliberately bypassing the signature to exercise the runtime guard.
      expect(() => deriveDtcBadgeSeverity(value as string)).not.toThrow();
      expect(deriveDtcBadgeSeverity(value as string)).toBe('unknown');
    }
  });

  it('always returns a member of the closed badge union', () => {
    const allowed = ['critical', 'warning', 'info', 'unknown'];
    for (const dtc of mockDtcs) {
      expect(allowed).toContain(deriveDtcBadgeSeverity(dtc.severity_raw));
    }
  });
});

describe('groupDtcs', () => {
  /** Minimal `Dtc` shaped for grouping/ordering assertions. */
  function dtc(over: Partial<Dtc> & Pick<Dtc, 'id' | 'grouping'>): Dtc {
    return {
      vehicle_id: 'v1',
      sync_session_id: null,
      code: 'P0100',
      description: null,
      severity_raw: null,
      first_seen_at: '2026-06-01T00:00:00.000Z',
      last_seen_at: '2026-06-01T00:00:00.000Z',
      is_active: true,
      cleared_at: null,
      cleared_by_user_id: null,
      freeze_frame_metrics: null,
      ...over,
    };
  }

  it('returns a bucket for every declared grouping, even when empty', () => {
    const groups = groupDtcs([]);
    expect(Object.keys(groups).sort()).toEqual([...DTC_GROUPINGS].sort());
    for (const key of DTC_GROUPINGS) expect(groups[key]).toEqual([]);
  });

  it('splits the mock fixtures across all three groups', () => {
    const groups = groupDtcs(dtcsForVehicle(MOCK_VEHICLE_ID));
    expect(groups.active.length).toBeGreaterThan(0);
    expect(groups.pending.length).toBeGreaterThan(0);
    expect(groups.history.length).toBeGreaterThan(0);
    // Nothing is dropped or duplicated by the split.
    const total = groups.active.length + groups.pending.length + groups.history.length;
    expect(total).toBe(mockDtcs.length);
  });

  it('routes a cleared code to history regardless of severity', () => {
    const groups = groupDtcs([
      dtc({ id: 'a', grouping: 'history', severity_raw: 'critical', is_active: false }),
    ]);
    expect(groups.history.map((d) => d.id)).toEqual(['a']);
    expect(groups.active).toEqual([]);
  });

  it('leaves pending empty when nothing carries the mock overlay (the LIVE shape)', () => {
    // CF-29: no real row can derive as 'pending', so this is what the live path looks
    // like today. The group must still exist as an empty bucket, not be absent.
    const groups = groupDtcs([
      dtc({ id: 'a', grouping: 'active' }),
      dtc({ id: 'b', grouping: 'history' }),
    ]);
    expect(groups.pending).toEqual([]);
    expect(groups.active).toHaveLength(1);
    expect(groups.history).toHaveLength(1);
  });

  it('orders within a group by badge severity, then last_seen_at DESC', () => {
    const groups = groupDtcs([
      dtc({ id: 'info-new', grouping: 'active', severity_raw: 'info', last_seen_at: '2026-06-20T00:00:00.000Z' }),
      dtc({ id: 'unknown', grouping: 'active', severity_raw: 'nonsense', last_seen_at: '2026-06-25T00:00:00.000Z' }),
      dtc({ id: 'warn-old', grouping: 'active', severity_raw: 'WARN', last_seen_at: '2026-06-10T00:00:00.000Z' }),
      dtc({ id: 'warn-new', grouping: 'active', severity_raw: 'warning', last_seen_at: '2026-06-18T00:00:00.000Z' }),
      dtc({ id: 'crit', grouping: 'active', severity_raw: 'critical', last_seen_at: '2026-06-01T00:00:00.000Z' }),
    ]);
    expect(groups.active.map((d) => d.id)).toEqual([
      'crit', // critical outranks everything, even though it is the oldest
      'warn-new', // warning tier, newest first
      'warn-old',
      'info-new',
      'unknown', // unrankable sorts last, despite being the most recent
    ]);
  });

  it('treats an unparseable last_seen_at as oldest rather than floating it to the top', () => {
    const groups = groupDtcs([
      dtc({ id: 'bad', grouping: 'active', severity_raw: 'info', last_seen_at: 'not-a-date' }),
      dtc({ id: 'good', grouping: 'active', severity_raw: 'info', last_seen_at: '2026-06-01T00:00:00.000Z' }),
    ]);
    expect(groups.active.map((d) => d.id)).toEqual(['good', 'bad']);
  });

  it('does not mutate or reorder the input array', () => {
    const input = [
      dtc({ id: 'a', grouping: 'active', severity_raw: 'info' }),
      dtc({ id: 'b', grouping: 'active', severity_raw: 'critical' }),
    ];
    const snapshot = input.map((d) => d.id);
    groupDtcs(input);
    expect(input.map((d) => d.id)).toEqual(snapshot);
  });

  it('degrades an off-union grouping into active rather than dropping the row', () => {
    // Only reachable from an unvalidated live row; a code must never silently vanish.
    const rogue = dtc({ id: 'x', grouping: 'active' });
    const groups = groupDtcs([{ ...rogue, grouping: 'archived' as Dtc['grouping'] }]);
    expect(groups.active.map((d) => d.id)).toEqual(['x']);
  });
});

describe('parseFreezeFrameMetrics', () => {
  it('parses a well-formed blob', () => {
    expect(parseFreezeFrameMetrics({ rpm: 5820, coolant_temp_c: 99.2 })).toEqual({
      rpm: 5820,
      coolant_temp_c: 99.2,
    });
  });

  it('returns null for null/undefined (the column is nullable)', () => {
    expect(parseFreezeFrameMetrics(null)).toBeNull();
    expect(parseFreezeFrameMetrics(undefined)).toBeNull();
  });

  it('returns null for an empty blob (nothing to render a panel from)', () => {
    expect(parseFreezeFrameMetrics({})).toBeNull();
  });

  it('never throws on malformed input — it degrades to null', () => {
    // The DTC must still render its code/title/dates if the freeze frame is garbage.
    for (const bad of ['string', 42, [], [1, 2], { rpm: 'fast' }, { rpm: Number.NaN }]) {
      expect(() => parseFreezeFrameMetrics(bad)).not.toThrow();
      expect(parseFreezeFrameMetrics(bad)).toBeNull();
    }
  });
});

describe('toFreezeFrameTiles', () => {
  it('formats value + unit per the provisional metric key', () => {
    const tiles = toFreezeFrameTiles({ coolant_temp_c: 99.2, rpm: 5820 });
    expect(tiles).toEqual([
      { key: 'rpm', value: '5820', unit: 'rpm' },
      { key: 'coolant_temp_c', value: '99.2', unit: '°C' },
    ]);
  });

  it('orders known keys by TILE_ORDER, not by object key order', () => {
    const tiles = toFreezeFrameTiles({
      fuel_level_pct: 60,
      rpm: 3000,
      coolant_temp_c: 90,
      boost_pressure_kpa: 40,
    });
    expect(tiles.map((t) => t.key)).toEqual([
      'rpm',
      'boost_pressure_kpa',
      'coolant_temp_c',
      'fuel_level_pct',
    ]);
  });

  it('renders an unrecognised key rather than hiding it, unitless and after the known set', () => {
    const tiles = toFreezeFrameTiles({ oil_pressure_bar: 4.2, rpm: 3000 });
    expect(tiles).toEqual([
      { key: 'rpm', value: '3000', unit: 'rpm' },
      { key: 'oil_pressure_bar', value: '4', unit: undefined },
    ]);
  });

  it('sorts multiple unrecognised keys alphabetically for deterministic output', () => {
    const tiles = toFreezeFrameTiles({ zeta_x: 1, alpha_x: 2 });
    expect(tiles.map((t) => t.key)).toEqual(['alpha_x', 'zeta_x']);
  });

  it('returns [] for a null or malformed blob (caller reads that as "no panel")', () => {
    expect(toFreezeFrameTiles(null)).toEqual([]);
    expect(toFreezeFrameTiles({ rpm: 'fast' })).toEqual([]);
    expect(toFreezeFrameTiles([])).toEqual([]);
  });

  it('applies per-key precision', () => {
    // rpm is a whole number; coolant/boost carry one decimal (see METRIC_DISPLAY).
    const tiles = toFreezeFrameTiles({ rpm: 5820.7, boost_pressure_kpa: 121.44 });
    expect(tiles.map((t) => t.value)).toEqual(['5821', '121.4']);
  });
});

describe('dev DTC fixture variants', () => {
  // These exist so S5's per-group EMPTY state is reachable on-device — the one in-scope
  // path the session-34b device run could not exercise. What's asserted here is the
  // SELECTION (which groups survive), not `groupDtcs`, which has its own suite above.

  /** Distinct groupings present in a variant's rows. */
  function groupsIn(vehicleId: string): DtcGrouping[] {
    return [...new Set(dtcsForVehicle(vehicleId).map((d) => d.grouping))].sort();
  }

  it('leaves the DEFAULT fixture untouched — all three groups still populated', () => {
    // The populated case is the verified reference; a variant must never alter it.
    expect(groupsIn(MOCK_VEHICLE_ID)).toEqual(['active', 'history', 'pending']);
    expect(dtcsForVehicle(MOCK_VEHICLE_ID)).toHaveLength(mockDtcs.length);
  });

  it('noPending drops ONLY the pending group — the live shape under CF-29', () => {
    const groups = groupsIn(DEV_DTC_FIXTURE_VEHICLE_IDS.noPending);
    expect(groups).toEqual(['active', 'history']);
    expect(groups).not.toContain('pending');
  });

  it('activeOnly and historyOnly leave exactly one group populated', () => {
    expect(groupsIn(DEV_DTC_FIXTURE_VEHICLE_IDS.activeOnly)).toEqual(['active']);
    expect(groupsIn(DEV_DTC_FIXTURE_VEHICLE_IDS.historyOnly)).toEqual(['history']);
  });

  it('every variant is a strict SUBSET of the default fixture — rows are filtered, not invented', () => {
    const defaultIds = new Set(dtcsForVehicle(MOCK_VEHICLE_ID).map((d) => d.id));
    for (const vehicleId of Object.values(DEV_DTC_FIXTURE_VEHICLE_IDS)) {
      const rows = dtcsForVehicle(vehicleId);
      expect(rows.length).toBeGreaterThan(0); // a variant that empties everything is the unknown-vehicle path, not a variant
      expect(rows.length).toBeLessThan(defaultIds.size);
      for (const row of rows) expect(defaultIds.has(row.id)).toBe(true);
    }
  });

  it('an unknown vehicle still returns [] (whole-screen empty, not three empty groups)', () => {
    expect(dtcsForVehicle('00000000-0000-4000-8000-000000000000')).toEqual([]);
  });
});

describe('dtcTitle', () => {
  it('prefers the plain-language title over the SAE description (design §6)', () => {
    expect(dtcTitle({ code: 'P0234', description: 'Turbocharger/Supercharger Overboost Condition' }))
      .toBe('Turbo is boosting harder than it should');
  });

  it('falls back to the ECU description for an uncovered code', () => {
    expect(dtcTitle({ code: 'P0999', description: 'Some Unmapped Circuit Fault' })).toBe(
      'Some Unmapped Circuit Fault',
    );
  });

  it('falls back to the raw code when there is no description either', () => {
    expect(dtcTitle({ code: 'P0999', description: null })).toBe('P0999');
    expect(dtcTitle({ code: 'P0999', description: '   ' })).toBe('P0999');
  });

  it('never returns an empty headline', () => {
    for (const description of [null, '', '  ']) {
      expect(dtcTitle({ code: 'P0999', description }).length).toBeGreaterThan(0);
    }
  });
});

describe('DTC title coverage', () => {
  it('every mock DTC code has a plain-language title', () => {
    // Pins the stopgap map to the fixtures: adding a fixture code without a title
    // fails here rather than shipping raw jargon (or a bare code) into the S5 list.
    const uncovered = mockDtcs.map((d) => d.code).filter((code) => !hasPlainLanguageTitle(code));
    expect(uncovered).toEqual([]);
  });
});
