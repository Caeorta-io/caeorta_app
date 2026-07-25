import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tables } from '@caeorta/supabase';

import { deriveDtcGrouping, dtcRowSchema } from '@caeorta/types';

import {
  DATA_SOURCE,
  fetchCurrentState,
  fetchDrive,
  fetchDriveDiagnostics,
  fetchDrives,
  fetchDtc,
  fetchDtcs,
  fetchLastDrive,
  fetchRecentDiagnostics,
  fetchVehicle,
  fetchVehicles,
  subscribeToCurrentStateMock,
} from '../source';
import {
  MOCK_DRIVE_ID,
  MOCK_PENDING_DTC_IDS,
  MOCK_VEHICLE_ID,
  mockDrives,
  mockDtcs,
} from '../mocks';
import { deriveDriveHealth } from '../../driveHealth';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('data source factory (mock mode)', () => {
  it('defaults every capability to mock EXCEPT driveTelemetry (live from day one)', () => {
    const { driveTelemetry, ...rest } = DATA_SOURCE;
    // driveTelemetry is the deliberate exception: get_drive_telemetry is deployed, so it
    // reads live with no mock path (see source.ts). Everything else stays mock this build.
    expect(driveTelemetry).toBe('live');
    expect(Object.values(rest).every((mode) => mode === 'mock')).toBe(true);
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

describe('fetchDrives (keyset pagination)', () => {
  const LIMIT = 4;

  it('returns the newest page and a cursor when more drives remain', async () => {
    const page = await fetchDrives(MOCK_VEHICLE_ID, { limit: LIMIT });
    expect(page.drives).toHaveLength(LIMIT);
    // Newest-first within the page.
    const times = page.drives.map((d) => d.started_at);
    expect(times).toEqual([...times].sort((a, b) => b.localeCompare(a)));
    // Cursor is the last row's started_at, and there are more drives than one page.
    expect(page.nextCursor).toBe(page.drives.at(-1)?.started_at);
    expect(mockDrives.length).toBeGreaterThan(LIMIT);
  });

  it('the cursor page excludes the cursor row and continues newest-first', async () => {
    const first = await fetchDrives(MOCK_VEHICLE_ID, { limit: LIMIT });
    const second = await fetchDrives(MOCK_VEHICLE_ID, { limit: LIMIT, cursor: first.nextCursor });
    // No overlap: every second-page row is strictly older than the cursor.
    const cursor = first.nextCursor;
    expect(cursor).not.toBeNull();
    expect(second.drives.every((d) => d.started_at < cursor!)).toBe(true);
  });

  it('walks every drive exactly once, in strict newest-first order, ending with a null cursor', async () => {
    const collected: string[] = [];
    let cursor: string | null = null;
    for (let guard = 0; guard < 50; guard += 1) {
      const page = await fetchDrives(MOCK_VEHICLE_ID, { limit: LIMIT, cursor });
      collected.push(...page.drives.map((d) => d.started_at));
      if (page.nextCursor === null) break;
      cursor = page.nextCursor;
    }
    // Covers all drives, no duplicates.
    expect(collected).toHaveLength(mockDrives.length);
    expect(new Set(collected).size).toBe(mockDrives.length);
    // Strictly descending by started_at across page boundaries.
    expect(collected).toEqual([...collected].sort((a, b) => b.localeCompare(a)));
  });

  it('returns everything with a null cursor when the limit exceeds the total', async () => {
    const page = await fetchDrives(MOCK_VEHICLE_ID, { limit: mockDrives.length + 10 });
    expect(page.drives).toHaveLength(mockDrives.length);
    expect(page.nextCursor).toBeNull();
  });

  it('returns an empty page with a null cursor for an unknown vehicle', async () => {
    expect(await fetchDrives(UNKNOWN_ID, { limit: LIMIT })).toEqual({
      drives: [],
      healthByDriveId: {},
      nextCursor: null,
    });
  });

  it('carries per-drive health flags for exactly the drives on the page', async () => {
    const page = await fetchDrives(MOCK_VEHICLE_ID, { limit: LIMIT });
    // The sidecar map keys are exactly this page's drive ids (no more, no less).
    expect(Object.keys(page.healthByDriveId).sort()).toEqual(
      page.drives.map((d) => d.id).sort(),
    );
    // The last drive has both a critical and a warning diagnostic → both flags set.
    expect(page.healthByDriveId[MOCK_DRIVE_ID]).toEqual({ hasCritical: true, hasWarning: true });
  });
});

describe('fetchDrive / fetchDriveDiagnostics', () => {
  it('fetchDrive returns the drive by id, null for an unknown id', async () => {
    const drive = await fetchDrive(MOCK_DRIVE_ID);
    expect(drive?.id).toBe(MOCK_DRIVE_ID);
    expect(await fetchDrive(UNKNOWN_ID)).toBeNull();
  });

  it('fetchDriveDiagnostics returns the drive-linked diagnostics, newest-first', async () => {
    const diagnostics = await fetchDriveDiagnostics(MOCK_DRIVE_ID);
    // The last drive carries the three seeded diagnostics (critical/warning/info).
    expect(diagnostics.length).toBeGreaterThanOrEqual(3);
    expect(diagnostics.every((d) => d.referenced_drive_id === MOCK_DRIVE_ID)).toBe(true);
    const times = diagnostics.map((d) => Date.parse(d.generated_at));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('fetchDriveDiagnostics is empty for a drive with no linked diagnostics', async () => {
    expect(await fetchDriveDiagnostics(UNKNOWN_ID)).toEqual([]);
  });

  // The fixture set must exercise every derived health tier (see deriveDriveHealth),
  // including the off-the-ladder insufficient_data case, so the screen states are real.
  it('the mock fixtures span all three health tiers plus the insufficient_data case', async () => {
    const NEEDS_LOOK_DRIVE = '77777777-7777-4777-8777-777777777702'; // warning-only
    const INSUFFICIENT_DRIVE = '77777777-7777-4777-8777-777777777707'; // insufficient_data-only
    const CLEAN_DRIVE = '77777777-7777-4777-8777-777777777703'; // no diagnostics

    expect(deriveDriveHealth(await fetchDriveDiagnostics(MOCK_DRIVE_ID))).toBe('check_now');
    expect(deriveDriveHealth(await fetchDriveDiagnostics(NEEDS_LOOK_DRIVE))).toBe('needs_look');
    expect(deriveDriveHealth(await fetchDriveDiagnostics(CLEAN_DRIVE))).toBe('clean');

    // insufficient_data must NOT elevate: the drive still reads clean despite having a
    // linked diagnostic.
    const insufficient = await fetchDriveDiagnostics(INSUFFICIENT_DRIVE);
    expect(insufficient).toHaveLength(1);
    expect(insufficient[0]?.severity).toBe('insufficient_data');
    expect(deriveDriveHealth(insufficient)).toBe('clean');
  });
});

describe('DTC seam (mock mode)', () => {
  it('fetchDtcs returns the vehicle rows newest-first by last_seen_at', async () => {
    const dtcs = await fetchDtcs(MOCK_VEHICLE_ID);
    expect(dtcs.length).toBe(mockDtcs.length);
    expect(dtcs.every((d) => d.vehicle_id === MOCK_VEHICLE_ID)).toBe(true);
    const times = dtcs.map((d) => Date.parse(d.last_seen_at));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('fetchDtcs is empty for an unknown vehicle', async () => {
    expect(await fetchDtcs(UNKNOWN_ID)).toEqual([]);
  });

  it('fetchDtc returns the row by id, null when unknown', async () => {
    const target = mockDtcs[0] as Tables<'dtcs'>;
    expect((await fetchDtc(target.id))?.code).toBe(target.code);
    expect(await fetchDtc(UNKNOWN_ID)).toBeNull();
  });

  // The fixtures must exercise all three S5 sections, or the Day-3 list screen would be
  // built against data that can't show two of them.
  it('the fixtures span all three groupings', async () => {
    const dtcs = await fetchDtcs(MOCK_VEHICLE_ID);
    const groups = new Set(dtcs.map((d) => d.grouping));
    expect([...groups].sort()).toEqual(['active', 'history', 'pending']);
  });

  it('every cleared row groups as history and every history row is cleared', async () => {
    const dtcs = await fetchDtcs(MOCK_VEHICLE_ID);
    for (const d of dtcs) {
      const cleared = d.cleared_at !== null || !d.is_active;
      expect(d.grouping === 'history').toBe(cleared);
    }
  });

  // CF-29: 'pending' exists ONLY because the mock seam overlays it. Nothing on the row
  // distinguishes a pending DTC from an active one — this test documents that, so a
  // future live flip that silently drops the group is caught here.
  it('pending is indistinguishable from active on the row itself (CF-29)', async () => {
    const dtcs = await fetchDtcs(MOCK_VEHICLE_ID);
    const pending = dtcs.filter((d) => d.grouping === 'pending');
    expect(pending.length).toBeGreaterThan(0);
    for (const d of pending) {
      // Same column state as an active row; only MOCK_PENDING_DTC_IDS separates them.
      expect(d.is_active).toBe(true);
      expect(d.cleared_at).toBeNull();
      expect(deriveDtcGrouping(d)).toBe('active');
      expect(MOCK_PENDING_DTC_IDS.has(d.id)).toBe(true);
    }
  });

  it('the fixtures cover both the freeze-frame-present and freeze-frame-absent paths', async () => {
    const dtcs = await fetchDtcs(MOCK_VEHICLE_ID);
    expect(dtcs.some((d) => d.freeze_frame_metrics !== null)).toBe(true);
    expect(dtcs.some((d) => d.freeze_frame_metrics === null)).toBe(true);
  });

  it('every fixture row satisfies the boundary schema', async () => {
    // mocks.ts pins the fixtures to Tables<'dtcs'> structurally; this pins the VALUES
    // (uuid shapes, non-empty codes, finite freeze-frame numbers) the seam promises.
    for (const dtc of await fetchDtcs(MOCK_VEHICLE_ID)) {
      const { grouping: _grouping, ...row } = dtc;
      expect(dtcRowSchema.safeParse(row).success).toBe(true);
    }
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
