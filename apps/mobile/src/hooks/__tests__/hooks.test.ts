import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { MOCK_DRIVE_ID, MOCK_VEHICLE_ID } from '@/lib/data/mocks';

import { useCurrentState } from '../useCurrentState';
import { useDrive } from '../useDrive';
import { useDriveDiagnostics } from '../useDriveDiagnostics';
import { useDrives, DRIVES_PAGE_SIZE } from '../useDrives';
import { useLastDrive } from '../useLastDrive';
import { useRecentDiagnostics } from '../useRecentDiagnostics';
import { useVehicle, useVehicles } from '../useVehicles';

/** Fresh QueryClient per test so caches never leak between hooks. */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe('vehicle dashboard hooks resolve mock data', () => {
  it('useVehicles resolves the seeded vehicle', async () => {
    const { result } = renderHook(() => useVehicles(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe(MOCK_VEHICLE_ID);
  });

  it('useVehicle resolves a single vehicle by id', async () => {
    const { result } = renderHook(() => useVehicle(MOCK_VEHICLE_ID), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(MOCK_VEHICLE_ID);
  });

  it('useLastDrive resolves the completed drive', async () => {
    const { result } = renderHook(() => useLastDrive(MOCK_VEHICLE_ID), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.vehicle_id).toBe(MOCK_VEHICLE_ID);
    expect(result.current.data?.ended_at).not.toBeNull();
  });

  it('useRecentDiagnostics resolves diagnostics newest-first within the limit', async () => {
    const { result } = renderHook(() => useRecentDiagnostics(MOCK_VEHICLE_ID, 3), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0]?.severity).toBe('critical');
  });

  it('useDrive resolves a single drive by id', async () => {
    const { result } = renderHook(() => useDrive(MOCK_VEHICLE_ID, MOCK_DRIVE_ID), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(MOCK_DRIVE_ID);
  });

  it('useDriveDiagnostics resolves the drive-linked diagnostics', async () => {
    const { result } = renderHook(() => useDriveDiagnostics(MOCK_VEHICLE_ID, MOCK_DRIVE_ID), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.every((d) => d.referenced_drive_id === MOCK_DRIVE_ID)).toBe(true);
  });

  it('useCurrentState resolves the latest snapshot', async () => {
    const { result } = renderHook(() => useCurrentState(MOCK_VEHICLE_ID), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.vehicle_id).toBe(MOCK_VEHICLE_ID);
  });

  it('useDrives resolves the first page and paginates on fetchNextPage', async () => {
    const { result } = renderHook(() => useDrives(MOCK_VEHICLE_ID), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // First page is a full page, newest-first, with more to come.
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0]?.drives).toHaveLength(DRIVES_PAGE_SIZE);
    expect(result.current.data?.pages[0]?.drives[0]?.vehicle_id).toBe(MOCK_VEHICLE_ID);
    expect(result.current.hasNextPage).toBe(true);

    // Loading the next page appends a second page.
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages[1]?.drives.length).toBeGreaterThan(0);
  });
});
