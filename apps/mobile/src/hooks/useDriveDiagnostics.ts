import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@caeorta/supabase';

import { fetchDriveDiagnostics } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/**
 * The diagnostics the AI agent linked to a specific drive (the drive-detail screen's
 * "diagnostics from this drive" section, and the source for that drive's derived
 * health). Resolves to `[]` when the drive flagged nothing. Fails soft at the call
 * site (an error reads as "no diagnostics", not a crashed screen), same policy as
 * `useRecentDiagnostics` on the vehicle-detail screen.
 */
export function useDriveDiagnostics(vehicleId: string, driveId: string) {
  return useQuery<Tables<'diagnostic_outputs'>[]>({
    queryKey: queryKeys.driveDiagnostics(vehicleId, driveId),
    queryFn: () => fetchDriveDiagnostics(driveId),
    enabled: vehicleId.length > 0 && driveId.length > 0,
  });
}
