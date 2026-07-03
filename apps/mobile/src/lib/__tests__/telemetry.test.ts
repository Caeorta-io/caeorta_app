import { describe, expect, it } from 'vitest';

import {
  parseDriveTelemetry,
  splitTelemetryChannels,
  TelemetryFetchError,
  type TelemetryPoint,
} from '../telemetry';

const T0 = '2026-06-22T07:12:00.000Z';
const T1 = '2026-06-22T07:12:01.000Z';
const T2 = '2026-06-22T07:12:02.000Z';

describe('splitTelemetryChannels', () => {
  it('splits an all-channel stream into one series per requested key', () => {
    const points: TelemetryPoint[] = [
      { t: T0, metrics: { speed_kph: 40, coolant_temp_c: 90 } },
      { t: T1, metrics: { speed_kph: 55, coolant_temp_c: 92 } },
    ];

    const out = splitTelemetryChannels(points, ['speed_kph', 'coolant_temp_c']);

    expect(out.speed_kph).toEqual([
      { x: Date.parse(T0), y: 40 },
      { x: Date.parse(T1), y: 55 },
    ]);
    expect(out.coolant_temp_c).toEqual([
      { x: Date.parse(T0), y: 90 },
      { x: Date.parse(T1), y: 92 },
    ]);
  });

  it('skips a point where the channel is ABSENT — missing is not zero', () => {
    const points: TelemetryPoint[] = [
      { t: T0, metrics: { speed_kph: 40 } }, // boost absent
      { t: T1, metrics: { speed_kph: 55, boost_pressure_kpa: 70 } },
      { t: T2, metrics: { speed_kph: 60 } }, // boost absent again
    ];

    const out = splitTelemetryChannels(points, ['boost_pressure_kpa']);

    // Only the one point that actually carried boost — NOT three points with 0s.
    expect(out.boost_pressure_kpa).toEqual([{ x: Date.parse(T1), y: 70 }]);
  });

  it('skips null / non-numeric / NaN channel values (never coerced to 0)', () => {
    const points: TelemetryPoint[] = [
      { t: T0, metrics: { coolant_temp_c: null } },
      { t: T1, metrics: { coolant_temp_c: 'hot' } },
      { t: T2, metrics: { coolant_temp_c: Number.NaN } },
    ];

    const out = splitTelemetryChannels(points, ['coolant_temp_c']);

    expect(out.coolant_temp_c).toEqual([]);
  });

  it('yields an empty series for a channel absent from EVERY point (honest empty state)', () => {
    const points: TelemetryPoint[] = [
      { t: T0, metrics: { speed_kph: 40 } },
      { t: T1, metrics: { speed_kph: 55 } },
    ];

    const out = splitTelemetryChannels(points, ['speed_kph', 'boost_pressure_kpa']);

    expect(out.speed_kph).toHaveLength(2);
    // Requested key present in the result map, but with no samples.
    expect(out.boost_pressure_kpa).toEqual([]);
  });

  it('returns an entry for every requested key even when there are no points at all', () => {
    const out = splitTelemetryChannels([], ['speed_kph', 'boost_pressure_kpa', 'coolant_temp_c']);
    expect(out).toEqual({ speed_kph: [], boost_pressure_kpa: [], coolant_temp_c: [] });
  });

  it('drops points with an unparseable timestamp', () => {
    const points: TelemetryPoint[] = [
      { t: 'not-a-date', metrics: { speed_kph: 40 } },
      { t: T1, metrics: { speed_kph: 55 } },
    ];

    const out = splitTelemetryChannels(points, ['speed_kph']);

    expect(out.speed_kph).toEqual([{ x: Date.parse(T1), y: 55 }]);
  });
});

describe('parseDriveTelemetry', () => {
  it('accepts a well-formed all-channel body', () => {
    const body = {
      drive_id: 'd1',
      points: [{ t: T0, metrics: { speed_kph: 40 } }],
      total_rows: 1,
      returned_rows: 1,
    };
    expect(parseDriveTelemetry(body)).toEqual(body);
  });

  it('throws a 500 TelemetryFetchError on a malformed body', () => {
    expect(() => parseDriveTelemetry({ nope: true })).toThrow(TelemetryFetchError);
    try {
      parseDriveTelemetry({ nope: true });
    } catch (err) {
      expect((err as TelemetryFetchError).status).toBe(500);
    }
  });
});
