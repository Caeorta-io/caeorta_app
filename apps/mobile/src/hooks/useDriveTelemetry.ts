import { useQuery } from '@tanstack/react-query';

import { fetchDriveTelemetry } from '@/lib/data/source';
import type { DriveTelemetry } from '@/lib/telemetry';

import { queryKeys } from './queryKeys';

/**
 * A drive's full (all-channel) telemetry for the drive-detail Speed/Boost/Coolant charts.
 * Keyed by `driveId` alone (telemetry is immutable per drive). This is the app's first
 * LIVE Edge Function read — the query throws `TelemetryFetchError` on failure, which the
 * screen maps to per-chart error copy; it never blocks the rest of the screen.
 *
 * One request returns every channel (no `metric` param); the screen splits it client-side
 * with `splitTelemetryChannels`. A retry (`refetch`) re-runs the single request for all
 * three charts.
 */
export function useDriveTelemetry(driveId: string) {
  return useQuery<DriveTelemetry>({
    queryKey: queryKeys.driveTelemetry(driveId),
    queryFn: () => fetchDriveTelemetry(driveId),
    enabled: driveId.length > 0,
    // Telemetry for a completed drive doesn't change; don't retry a 4xx auth/ownership
    // error into a spinner loop — surface it once so the inline retry is the user's call.
    retry: false,
  });
}
