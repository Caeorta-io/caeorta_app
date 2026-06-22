import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { MOCK_VEHICLE_ID } from '@/lib/data/mocks';

import { useCurrentState } from '../useCurrentState';
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

  it('useCurrentState resolves the latest snapshot', async () => {
    const { result } = renderHook(() => useCurrentState(MOCK_VEHICLE_ID), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.vehicle_id).toBe(MOCK_VEHICLE_ID);
  });
});
