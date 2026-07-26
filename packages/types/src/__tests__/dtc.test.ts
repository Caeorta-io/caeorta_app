import { describe, expect, it } from 'vitest';

import {
  deriveDtcGrouping,
  dtcRowSchema,
  freezeFrameMetricsSchema,
  DTC_GROUPINGS,
  DTC_GROUPING_ORDER,
} from '../dtc';

/** A valid, active row with a freeze frame — the baseline every case varies from. */
const baseRow = {
  id: '88888888-8888-4888-8888-888888888801',
  vehicle_id: '11111111-1111-4111-8111-111111111111',
  sync_session_id: '55555555-5555-4555-8555-555555555555',
  code: 'P0234',
  description: 'Turbocharger/Supercharger Overboost Condition',
  severity_raw: 'critical',
  first_seen_at: '2026-06-22T07:31:12.000Z',
  last_seen_at: '2026-06-22T07:44:02.000Z',
  is_active: true,
  cleared_at: null,
  cleared_by_user_id: null,
  freeze_frame_metrics: { rpm: 5820, boost_pressure_kpa: 121.4 },
};

describe('dtcRowSchema', () => {
  it('accepts a well-formed row', () => {
    expect(dtcRowSchema.safeParse(baseRow).success).toBe(true);
  });

  it('accepts a null freeze frame (the column is nullable and often unset)', () => {
    expect(dtcRowSchema.safeParse({ ...baseRow, freeze_frame_metrics: null }).success).toBe(true);
  });

  it('accepts null description / severity_raw (the ECU need not report either)', () => {
    const sparse = { ...baseRow, description: null, severity_raw: null };
    expect(dtcRowSchema.safeParse(sparse).success).toBe(true);
  });

  it('accepts a PostgREST timestamptz with a numeric offset', () => {
    // Why timestamps are z.string().min(1) and not z.string().datetime(): PostgREST
    // renders timestamptz as '+00:00', which zod's default .datetime() rejects.
    const offset = { ...baseRow, first_seen_at: '2026-06-22T07:31:12+00:00' };
    expect(dtcRowSchema.safeParse(offset).success).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    expect(dtcRowSchema.safeParse({ ...baseRow, id: 'nope' }).success).toBe(false);
  });

  it('rejects an empty code (the badge would render blank)', () => {
    expect(dtcRowSchema.safeParse({ ...baseRow, code: '' }).success).toBe(false);
  });
});

describe('freezeFrameMetricsSchema', () => {
  it('accepts a flat key→number bag (the shape device_sync_chunk writes)', () => {
    const parsed = freezeFrameMetricsSchema.safeParse({ rpm: 5820, coolant_temp_c: 99.2 });
    expect(parsed.success).toBe(true);
  });

  it('accepts an empty object', () => {
    expect(freezeFrameMetricsSchema.safeParse({}).success).toBe(true);
  });

  it('rejects non-numeric and non-finite values rather than coercing them', () => {
    // A coerced NaN would render as 'NaN' in a Metric Tile; fail at the boundary.
    expect(freezeFrameMetricsSchema.safeParse({ rpm: '5820' }).success).toBe(false);
    expect(freezeFrameMetricsSchema.safeParse({ rpm: Number.POSITIVE_INFINITY }).success).toBe(
      false,
    );
    expect(freezeFrameMetricsSchema.safeParse({ rpm: Number.NaN }).success).toBe(false);
  });

  it('rejects a nested object (freeze frames are flat, not {value,unit,label} triples)', () => {
    const triple = { rpm: { value: 5820, unit: 'rpm', label: 'Engine speed' } };
    expect(freezeFrameMetricsSchema.safeParse(triple).success).toBe(false);
  });
});

describe('deriveDtcGrouping', () => {
  it('groups an uncleared, active row as active', () => {
    expect(deriveDtcGrouping({ is_active: true, cleared_at: null })).toBe('active');
  });

  it('groups a row with cleared_at as history', () => {
    expect(deriveDtcGrouping({ is_active: false, cleared_at: '2026-06-15T03:00:00.000Z' })).toBe(
      'history',
    );
  });

  it('groups an inactive row as history even without a cleared_at stamp', () => {
    // Defensive: is_active=false with a null cleared_at shouldn't read as active.
    expect(deriveDtcGrouping({ is_active: false, cleared_at: null })).toBe('history');
  });

  it('groups a cleared-but-still-active row as history (cleared_at wins)', () => {
    expect(deriveDtcGrouping({ is_active: true, cleared_at: '2026-06-15T03:00:00.000Z' })).toBe(
      'history',
    );
  });

  it('NEVER derives pending — the schema carries no pending signal (CF-29)', () => {
    // The load-bearing assertion for CF-29. If Platform lands a pending column and
    // deriveDtcGrouping starts returning 'pending', this test must be updated
    // deliberately — the gap cannot close silently.
    const permutations = [
      { is_active: true, cleared_at: null },
      { is_active: false, cleared_at: null },
      { is_active: true, cleared_at: '2026-06-15T03:00:00.000Z' },
      { is_active: false, cleared_at: '2026-06-15T03:00:00.000Z' },
    ];
    for (const row of permutations) {
      expect(deriveDtcGrouping(row)).not.toBe('pending');
    }
  });
});

describe('grouping constants', () => {
  it('DTC_GROUPING_ORDER covers every grouping exactly once', () => {
    expect([...DTC_GROUPING_ORDER].sort()).toEqual([...DTC_GROUPINGS].sort());
    expect(DTC_GROUPING_ORDER.length).toBe(new Set(DTC_GROUPING_ORDER).size);
  });

  it('orders active before pending before history (design §6 S5)', () => {
    expect(DTC_GROUPING_ORDER).toEqual(['active', 'pending', 'history']);
  });
});
