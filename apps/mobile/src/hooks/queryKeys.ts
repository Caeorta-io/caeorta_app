/**
 * Centralised TanStack Query keys for the vehicle-dashboard data seam.
 *
 * Kept in one place so invalidation stays consistent and the key hierarchy is
 * obvious: everything is namespaced under a vehicle so a single
 * `invalidateQueries({ queryKey: ['vehicles', id] })` sweeps a vehicle's whole
 * subtree (drive, diagnostics, current state).
 */
export const queryKeys = {
  vehicles: () => ['vehicles'] as const,
  vehicle: (id: string) => ['vehicles', id] as const,
  lastDrive: (vehicleId: string) => ['vehicles', vehicleId, 'last-drive'] as const,
  drives: (vehicleId: string) => ['vehicles', vehicleId, 'drives'] as const,
  drive: (vehicleId: string, driveId: string) =>
    ['vehicles', vehicleId, 'drive', driveId] as const,
  driveDiagnostics: (vehicleId: string, driveId: string) =>
    ['vehicles', vehicleId, 'drive', driveId, 'diagnostics'] as const,
  // Telemetry is keyed by driveId ALONE (not under the vehicle subtree): a drive's
  // telemetry is immutable once synced and identified fully by its own id, so it needn't
  // be swept by a per-vehicle invalidation.
  driveTelemetry: (driveId: string) => ['drive-telemetry', driveId] as const,
  recentDiagnostics: (vehicleId: string, limit: number) =>
    ['vehicles', vehicleId, 'diagnostics', { limit }] as const,
  currentState: (vehicleId: string) => ['vehicles', vehicleId, 'current-state'] as const,
} as const;
