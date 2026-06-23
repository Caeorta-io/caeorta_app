import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@caeorta/supabase';

import { fetchRecentDiagnostics } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/** Default count for the vehicle-detail "Recent diagnostics" preview. */
export const DEFAULT_RECENT_DIAGNOSTICS_LIMIT = 3;

/**
 * Newest diagnostics for a vehicle, newest-first ("Recent diagnostics" preview).
 * Defaults to the last {@link DEFAULT_RECENT_DIAGNOSTICS_LIMIT}.
 */
export function useRecentDiagnostics(
  vehicleId: string,
  limit: number = DEFAULT_RECENT_DIAGNOSTICS_LIMIT,
) {
  return useQuery<Tables<'diagnostic_outputs'>[]>({
    queryKey: queryKeys.recentDiagnostics(vehicleId, limit),
    queryFn: () => fetchRecentDiagnostics(vehicleId, limit),
    enabled: vehicleId.length > 0,
  });
}
