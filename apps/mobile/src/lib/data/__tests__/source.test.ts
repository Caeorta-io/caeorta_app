import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tables } from '@caeorta/supabase';

import {
  DATA_SOURCE,
  fetchCurrentState,
  fetchLastDrive,
  fetchRecentDiagnostics,
  fetchVehicle,
  fetchVehicles,
  subscribeToCurrentStateMock,
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

  it('DATA_SOURCE.currentStateSubscription defaults to mock', () => {
    expect(DATA_SOURCE.currentStateSubscription).toBe('mock');
  });
});

describe('subscribeToCurrentStateMock (Realtime emitter)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports connecting → open, then pushes a fresh payload every 2 s', () => {
    const onUpdate = vi.fn<(payload: Tables<'current_state'>) => void>();
    const onStatus = vi.fn<(status: 'open' | 'connecting' | 'closed') => void>();

    const unsubscribe = subscribeToCurrentStateMock(MOCK_VEHICLE_ID, onUpdate, onStatus);

    // 'connecting' is emitted synchronously on subscribe; no data yet.
    expect(onStatus.mock.calls).toEqual([['connecting']]);
    expect(onUpdate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(onStatus.mock.calls).toEqual([['connecting'], ['open']]);
    expect(onUpdate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const first = onUpdate.mock.calls[0]?.[0];
    expect(first?.vehicle_id).toBe(MOCK_VEHICLE_ID);

    // Each tick varies a provisional metric so the UI visibly updates.
    vi.advanceTimersByTime(2000);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    const second = onUpdate.mock.calls[1]?.[0];
    expect(second?.latest_metrics).not.toEqual(first?.latest_metrics);

    unsubscribe();
  });

  it('unsubscribe clears every timer and reports closed (unmount contract)', () => {
    const onUpdate = vi.fn<(payload: Tables<'current_state'>) => void>();
    const onStatus = vi.fn<(status: 'open' | 'connecting' | 'closed') => void>();

    const unsubscribe = subscribeToCurrentStateMock(MOCK_VEHICLE_ID, onUpdate, onStatus);
    vi.advanceTimersByTime(500 + 2000); // reach 'open' and one push
    expect(onUpdate).toHaveBeenCalledTimes(1);

    unsubscribe();

    // 'closed' is the final status, and no timers survive teardown.
    expect(onStatus.mock.calls.at(-1)).toEqual(['closed']);
    expect(vi.getTimerCount()).toBe(0);

    // No further pushes after unsubscribe, however long we run the clock.
    vi.advanceTimersByTime(10_000);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe before connect still clears the timer and reports closed', () => {
    const onUpdate = vi.fn<(payload: Tables<'current_state'>) => void>();
    const onStatus = vi.fn<(status: 'open' | 'connecting' | 'closed') => void>();

    const unsubscribe = subscribeToCurrentStateMock(MOCK_VEHICLE_ID, onUpdate, onStatus);
    unsubscribe(); // tear down while still 'connecting'

    expect(onStatus.mock.calls).toEqual([['connecting'], ['closed']]);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(10_000);
    expect(onStatus.mock.calls).toEqual([['connecting'], ['closed']]);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
