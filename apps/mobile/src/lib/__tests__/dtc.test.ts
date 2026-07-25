import { describe, expect, it } from 'vitest';

import { parseFreezeFrameMetrics, toFreezeFrameTiles } from '../dtc';
import { dtcTitle, hasPlainLanguageTitle } from '../dtcTitles';
import { mockDtcs } from '../data/mocks';

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
