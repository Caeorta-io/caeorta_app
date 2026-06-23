import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@caeorta/supabase';

import { fetchVehicle, fetchVehicles } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/** All vehicles owned by the current user (vehicle-list screen). */
export function useVehicles() {
  return useQuery<Tables<'vehicles'>[]>({
    queryKey: queryKeys.vehicles(),
    queryFn: fetchVehicles,
  });
}

/** A single vehicle by id (vehicle-detail header). Resolves to `null` if absent. */
export function useVehicle(id: string) {
  return useQuery<Tables<'vehicles'> | null>({
    queryKey: queryKeys.vehicle(id),
    queryFn: () => fetchVehicle(id),
    // Don't fire until we actually have an id (e.g. route param still resolving).
    enabled: id.length > 0,
  });
}
