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
  recentDiagnostics: (vehicleId: string, limit: number) =>
    ['vehicles', vehicleId, 'diagnostics', { limit }] as const,
  currentState: (vehicleId: string) => ['vehicles', vehicleId, 'current-state'] as const,
} as const;
