import { describe, expect, it } from 'vitest';

import {
  EMPTY_DASH,
  formatDistanceKm,
  formatDriveSummary,
  formatDuration,
  formatRelativeTime,
  formatSpeedKph,
  selectPeakMetrics,
} from '../format';
import { mockLastDrive } from '../data/mocks';

const NOW = Date.parse('2026-06-22T12:00:00.000Z');
const isoAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe('formatRelativeTime', () => {
  it('returns the dash for null', () => {
    expect(formatRelativeTime(null, NOW)).toBe(EMPTY_DASH);
  });

  it('returns "Just now" under a minute', () => {
    expect(formatRelativeTime(isoAgo(30_000), NOW)).toBe('Just now');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime(isoAgo(2 * 60_000), NOW)).toBe('2 min ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTime(isoAgo(2 * 60 * 60_000), NOW)).toBe('2 h ago');
  });

  it('formats days', () => {
    expect(formatRelativeTime(isoAgo(3 * 24 * 60 * 60_000), NOW)).toBe('3 d ago');
  });

  it('returns the dash for future / unparseable timestamps', () => {
    expect(formatRelativeTime(isoAgo(-60_000), NOW)).toBe(EMPTY_DASH);
    expect(formatRelativeTime('not-a-date', NOW)).toBe(EMPTY_DASH);
  });
});

describe('formatDriveSummary', () => {
  it('returns the dash for a null drive', () => {
    expect(formatDriveSummary(null)).toBe(EMPTY_DASH);
  });

  it('summarises the seeded drive as "24.6 km · 36 min"', () => {
    expect(formatDriveSummary(mockLastDrive)).toBe('24.6 km · 36 min');
  });

  it('returns the dash when distance or duration is missing', () => {
    expect(formatDriveSummary({ ...mockLastDrive, distance_km: null })).toBe(EMPTY_DASH);
    expect(formatDriveSummary({ ...mockLastDrive, duration_seconds: null })).toBe(EMPTY_DASH);
  });
});

describe('formatDistanceKm', () => {
  it('formats to one decimal + unit', () => {
    expect(formatDistanceKm(24.6)).toBe('24.6 km');
    expect(formatDistanceKm(7)).toBe('7.0 km');
  });

  it('returns the dash for null', () => {
    expect(formatDistanceKm(null)).toBe(EMPTY_DASH);
  });
});

describe('formatSpeedKph', () => {
  it('formats to one decimal + unit', () => {
    expect(formatSpeedKph(40.4)).toBe('40.4 kph');
  });

  it('returns the dash for null', () => {
    expect(formatSpeedKph(null)).toBe(EMPTY_DASH);
  });
});

describe('formatDuration', () => {
  it('shows whole minutes under an hour (no hours component)', () => {
    expect(formatDuration(2190)).toBe('36 min'); // the seeded drive
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(59 * 60)).toBe('59 min');
  });

  it('adds an hours component from 60 min up', () => {
    expect(formatDuration(60 * 60)).toBe('1 h 0 min');
    expect(formatDuration(65 * 60)).toBe('1 h 5 min');
    expect(formatDuration(150 * 60)).toBe('2 h 30 min');
  });

  it('returns the dash for null or negative input', () => {
    expect(formatDuration(null)).toBe(EMPTY_DASH);
    expect(formatDuration(-1)).toBe(EMPTY_DASH);
  });
});

describe('selectPeakMetrics', () => {
  const keys = ['rpm', 'speed_kph', 'coolant_temp_c'];

  it('pulls the requested keys in order from the seeded drive', () => {
    expect(selectPeakMetrics(mockLastDrive.peak_metrics, keys)).toEqual([
      { key: 'rpm', value: 6480 },
      { key: 'speed_kph', value: 132 },
      { key: 'coolant_temp_c', value: 101.5 },
    ]);
  });

  it('skips absent keys silently (no empty entries)', () => {
    expect(selectPeakMetrics({ rpm: 3000, coolant_temp_c: 90 }, keys)).toEqual([
      { key: 'rpm', value: 3000 },
      { key: 'coolant_temp_c', value: 90 },
    ]);
  });

  it('skips non-numeric and non-finite values', () => {
    expect(selectPeakMetrics({ rpm: 'fast', speed_kph: NaN, coolant_temp_c: 90 }, keys)).toEqual([
      { key: 'coolant_temp_c', value: 90 },
    ]);
  });

  it('returns an empty array for non-object jsonb', () => {
    expect(selectPeakMetrics(null, keys)).toEqual([]);
    expect(selectPeakMetrics([1, 2, 3], keys)).toEqual([]);
    expect(selectPeakMetrics('nope', keys)).toEqual([]);
  });
});
