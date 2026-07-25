import { useQuery } from '@tanstack/react-query';
import type { Dtc } from '@caeorta/types';

import { fetchDtc, fetchDtcs } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/**
 * All DTCs recorded for a vehicle (design §6 `S5 · DTC list`), newest-first by
 * `last_seen_at` and each stamped with its Active/Pending/History `grouping`. Resolves
 * to `[]` for a vehicle with no codes — the clean-car empty state, not an error.
 *
 * Unlike the drive-detail diagnostics hook, a DTC error should NOT fail soft at the
 * call site: DTCs are the screen's entire content, so "the list failed to load" and
 * "you have no fault codes" must not look the same. The S5 screen surfaces
 * `isError` explicitly (Day 3-4).
 */
export function useDtcs(vehicleId: string) {
  return useQuery<Dtc[]>({
    queryKey: queryKeys.dtcs(vehicleId),
    queryFn: () => fetchDtcs(vehicleId),
    enabled: vehicleId.length > 0,
  });
}

/**
 * A single DTC (design §6 `S6 · DTC detail`). Resolves to `null` when the id is
 * unknown, which the detail screen renders as a not-found state — the same
 * null-means-absent convention as `useDrive`.
 */
export function useDtc(vehicleId: string, dtcId: string) {
  return useQuery<Dtc | null>({
    queryKey: queryKeys.dtc(vehicleId, dtcId),
    queryFn: () => fetchDtc(dtcId),
    enabled: vehicleId.length > 0 && dtcId.length > 0,
  });
}
