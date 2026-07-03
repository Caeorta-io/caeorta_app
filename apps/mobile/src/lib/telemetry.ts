/**
 * Drive-telemetry response shape, boundary validation, and the pure channel-split
 * used by the drive-detail telemetry charts.
 *
 * This is the client half of the `get_drive_telemetry` Edge Function contract
 * (supabase/functions/get_drive_telemetry/index.ts). We call it WITHOUT a `metric`
 * param, so it returns EVERY channel per point in one round trip:
 *
 *   { drive_id, points: [{ t, metrics: { <key>: <number>, … } }], total_rows, returned_rows }
 *
 * (downsampled server-side to <= 300 points total, not per channel). The three
 * charts each want one channel, so we fetch once and {@link splitTelemetryChannels}
 * client-side rather than making three metric-scoped calls.
 *
 * No React / React-Native imports here — pure, so the parser and the split are
 * unit-testable in plain Node/vitest, same convention as `format.ts` / `driveHealth.ts`.
 * The live fetch that consumes these (and needs the Supabase client) lives separately
 * in `lib/data/telemetryLive.ts` so THIS module stays network-free.
 */
import { z } from 'zod';

/**
 * One telemetry sample as the function returns it: an ISO timestamp plus the opaque
 * jsonb `metrics` blob (all channels for that instant). `metrics` values are typed
 * `unknown` on purpose — the jsonb column has no schema and the metric-key vocabulary
 * is still provisional (see TODO(metric-keys) at the call sites), so we validate each
 * channel's value at read time in {@link splitTelemetryChannels} rather than trusting
 * a shape here.
 */
export const telemetryPointSchema = z.object({
  t: z.string(),
  metrics: z.record(z.string(), z.unknown()),
});

/** The all-channel `get_drive_telemetry` response (no `metric` param). */
export const driveTelemetrySchema = z.object({
  drive_id: z.string(),
  points: z.array(telemetryPointSchema),
  total_rows: z.number(),
  returned_rows: z.number(),
});

export type TelemetryPoint = z.infer<typeof telemetryPointSchema>;
export type DriveTelemetry = z.infer<typeof driveTelemetrySchema>;

/**
 * One charted point: epoch-ms x, numeric channel value y. A `type` (not an `interface`)
 * so it carries the implicit index signature Victory Native's `data` generic requires
 * (`RawData extends Record<string, unknown>`).
 */
export type TelemetrySample = {
  /** Sample time as epoch milliseconds (the chart x-axis). */
  x: number;
  /** The channel's value at this sample (the chart y-axis). */
  y: number;
};

/**
 * Error thrown by the live telemetry fetch, carrying the HTTP status (or the synthetic
 * `'network'` when the request never reached the server). The hook surfaces it and the
 * screen maps the status to per-chart copy — same convention as `pairDevice`'s status
 * codes, but thrown (a read, so no never-throws orchestrator).
 */
export class TelemetryFetchError extends Error {
  readonly status: number | 'network';

  constructor(status: number | 'network', message?: string) {
    super(message ?? `Telemetry request failed (status ${status})`);
    this.name = 'TelemetryFetchError';
    this.status = status;
  }
}

/**
 * Validate a raw `get_drive_telemetry` (all-channel) JSON body at the boundary. A body
 * that doesn't match the contract is treated as a server fault (500) rather than a
 * successful-but-empty result — a malformed 200 is not honest data.
 */
export function parseDriveTelemetry(json: unknown): DriveTelemetry {
  const parsed = driveTelemetrySchema.safeParse(json);
  if (!parsed.success) {
    throw new TelemetryFetchError(500, 'Malformed telemetry response');
  }
  return parsed.data;
}

/**
 * Split all-channel telemetry into one per-channel series for each requested key.
 *
 * For every key, keeps only the points where that channel is present AS A FINITE
 * NUMBER — a key absent from a point's `metrics`, or present but null / non-numeric /
 * NaN, is SKIPPED, never coerced to 0 (missing ≠ zero: a dropped sample must not read
 * as the engine hitting zero). Points with an unparseable timestamp are skipped
 * entirely. A channel absent from every point yields an empty array — the screen's
 * honest "no data for this metric" state, distinct from an error.
 *
 * Pure: the caller supplies the (provisional) key list; this does selection only.
 */
export function splitTelemetryChannels(
  points: readonly TelemetryPoint[],
  keys: readonly string[],
): Record<string, TelemetrySample[]> {
  const out: Record<string, TelemetrySample[]> = {};
  // Hold each channel's array by reference so the inner loop needs no re-lookup (and no
  // non-null index assertion under noUncheckedIndexedAccess).
  const buckets = keys.map((key) => {
    const samples: TelemetrySample[] = [];
    out[key] = samples;
    return { key, samples };
  });

  for (const point of points) {
    const x = Date.parse(point.t);
    if (Number.isNaN(x)) continue;
    for (const bucket of buckets) {
      const value = point.metrics[bucket.key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        bucket.samples.push({ x, y: value });
      }
    }
  }

  return out;
}
