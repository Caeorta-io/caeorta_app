import { describe, expect, it } from 'vitest';

import {
  DATA_SOURCE,
  fetchCurrentState,
  fetchLastDrive,
  fetchRecentDiagnostics,
  fetchVehicle,
  fetchVehicles,
} from '../source';
import { MOCK_VEHICLE_ID } from '../mocks';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('data source factory (mock mode)', () => {
  it('defaults every capability to mock — no live calls in this build', () => {
    expect(Object.values(DATA_SOURCE).every((mode) => mode === 'mock')).toBe(true);
  });

  it('fetchVehicles resolves the seeded vehicle', async () => {
    const rows = await fetchVehicles();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(MOCK_VEHICLE_ID);
  });

  it('fetchVehicle returns the vehicle by id, null when unknown', async () => {
    expect((await fetchVehicle(MOCK_VEHICLE_ID))?.id).toBe(MOCK_VEHICLE_ID);
    expect(await fetchVehicle(UNKNOWN_ID)).toBeNull();
  });

  it('fetchLastDrive returns a completed drive, null for an unknown vehicle', async () => {
    const drive = await fetchLastDrive(MOCK_VEHICLE_ID);
    expect(drive?.vehicle_id).toBe(MOCK_VEHICLE_ID);
    expect(drive?.ended_at).not.toBeNull();
    expect(await fetchLastDrive(UNKNOWN_ID)).toBeNull();
  });

  it('fetchRecentDiagnostics honours the limit and the empty case', async () => {
    expect(await fetchRecentDiagnostics(MOCK_VEHICLE_ID, 2)).toHaveLength(2);
    expect(await fetchRecentDiagnostics(MOCK_VEHICLE_ID, 3)).toHaveLength(3);
    expect(await fetchRecentDiagnostics(UNKNOWN_ID, 3)).toEqual([]);
  });

  it('fetchCurrentState returns a recent snapshot, null for an unknown vehicle', async () => {
    const before = Date.now();
    const state = await fetchCurrentState(MOCK_VEHICLE_ID);
    expect(state?.vehicle_id).toBe(MOCK_VEHICLE_ID);
    // currentStateForVehicle re-stamps updated_at to call time.
    expect(Date.parse(state?.updated_at ?? '')).toBeGreaterThanOrEqual(before);
    expect(await fetchCurrentState(UNKNOWN_ID)).toBeNull();
  });
});
