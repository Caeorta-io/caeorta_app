import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@caeorta/supabase';

import { fetchCurrentState } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/**
 * Latest `current_state` snapshot for a vehicle (drives the "Synced Xm ago" /
 * connection indicator and the initial value for Live mode). Resolves to `null`
 * when the device has never reported.
 *
 * Live mode's continuous updates come from the Realtime helper
 * `subscribeToCurrentState` in @caeorta/supabase — this hook supplies only the
 * one-shot initial snapshot, not the stream.
 */
export function useCurrentState(vehicleId: string) {
  return useQuery<Tables<'current_state'> | null>({
    queryKey: queryKeys.currentState(vehicleId),
    queryFn: () => fetchCurrentState(vehicleId),
    enabled: vehicleId.length > 0,
  });
}
