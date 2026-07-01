import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchDrives } from '@/lib/data/source';

import { queryKeys } from './queryKeys';

/**
 * Drives per page for the paginated drives list. Small so the mock fixtures span
 * multiple pages (scroll-to-load-more is exercised). The live query keys off the
 * same value.
 */
export const DRIVES_PAGE_SIZE = 4;

/**
 * Paginated, newest-first drives for a vehicle (the drives list screen). Keyset
 * pagination on `started_at`: `getNextPageParam` hands the page's `nextCursor` back
 * as the next `pageParam`, and `null` (end of list) disables further fetches. The
 * screen flattens `data.pages` and groups by date; it never branches on mock-vs-live.
 */
export function useDrives(vehicleId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.drives(vehicleId),
    queryFn: ({ pageParam }) => fetchDrives(vehicleId, { limit: DRIVES_PAGE_SIZE, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: vehicleId.length > 0,
  });
}
