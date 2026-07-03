import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@caeorta/supabase';

import { fetchDrive } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/**
 * A single completed drive by id (the drive-detail screen). Resolves to `null` when
 * no drive matches — the screen renders its not-found state. Keyed under the owning
 * vehicle so a `['vehicles', vehicleId]` invalidation sweeps it with the rest of the
 * subtree; `vehicleId` comes from the route, `driveId` identifies the row.
 */
export function useDrive(vehicleId: string, driveId: string) {
  return useQuery<Tables<'drives'> | null>({
    queryKey: queryKeys.drive(vehicleId, driveId),
    queryFn: () => fetchDrive(driveId),
    enabled: vehicleId.length > 0 && driveId.length > 0,
  });
}
