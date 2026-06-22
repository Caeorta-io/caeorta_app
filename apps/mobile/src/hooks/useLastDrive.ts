import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@caeorta/supabase';

import { fetchLastDrive } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/**
 * Most recent completed drive for a vehicle ("Last drive" card). Resolves to
 * `null` when the vehicle has no drives yet — the screen renders its empty state.
 */
export function useLastDrive(vehicleId: string) {
  return useQuery<Tables<'drives'> | null>({
    queryKey: queryKeys.lastDrive(vehicleId),
    queryFn: () => fetchLastDrive(vehicleId),
    enabled: vehicleId.length > 0,
  });
}
