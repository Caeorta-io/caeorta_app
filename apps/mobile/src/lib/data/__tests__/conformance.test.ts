import { describe, expect, it } from 'vitest';
import type { Tables } from '@caeorta/supabase';

import {
  MOCK_VEHICLE_ID,
  mockCurrentState,
  mockDiagnostics,
  mockLastDrive,
  mockVehicle,
} from '../mocks';

/**
 * Conformance: each fixture is assigned to its generated `Tables<>` Row type. The
 * typed assignments below are the real gate — if Platform regenerates
 * database.types.ts and a column changes, these stop compiling under `tsc --noEmit`
 * (and the fixtures' own `satisfies` clauses also fail). The runtime assertions
 * additionally pin the contract values the dashboard relies on.
 */
describe('mock fixtures conform to generated Tables<> types', () => {
  it('vehicle row matches Tables<vehicles>', () => {
    const row: Tables<'vehicles'> = mockVehicle; // compile-time conformance
    expect(row.id).toBe(MOCK_VEHICLE_ID);
    expect(row.owner_user_id).toBeTruthy();
  });

  it('completed drive matches Tables<drives> with consistent summary columns', () => {
    const row: Tables<'drives'> = mockLastDrive; // compile-time conformance
    expect(row.ended_at).not.toBeNull(); // "completed" drive
    expect(row.has_anomaly).toBe(false);

    const { distance_km, duration_seconds, average_speed_kph } = row;
    expect(distance_km).not.toBeNull();
    expect(duration_seconds).not.toBeNull();

    // average_speed_kph ≈ distance / (duration / 3600), within rounding.
    if (distance_km !== null && duration_seconds !== null && average_speed_kph !== null) {
      const derived = distance_km / (duration_seconds / 3600);
      expect(average_speed_kph).toBeCloseTo(derived, 0);
    }
  });

  it('current_state matches Tables<current_state> with a recent timestamp', () => {
    const row: Tables<'current_state'> = mockCurrentState; // compile-time conformance
    expect(typeof row.latest_metrics).toBe('object');
    expect(Number.isNaN(Date.parse(row.updated_at))).toBe(false);
  });

  it('diagnostics match Tables<diagnostic_outputs>, span severities, all status new', () => {
    const rows: Tables<'diagnostic_outputs'>[] = mockDiagnostics; // compile-time conformance
    expect(rows).toHaveLength(3);

    const severities = new Set(rows.map((d) => d.severity));
    expect(severities).toEqual(new Set(['info', 'warning', 'critical']));

    expect(rows.every((d) => d.status === 'new')).toBe(true);
    expect(rows.every((d) => d.confidence >= 0 && d.confidence <= 1)).toBe(true);

    // Newest-first ordering by generated_at (the live query orders desc).
    const times = rows.map((d) => Date.parse(d.generated_at));
    const sortedDesc = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sortedDesc);
  });
});
