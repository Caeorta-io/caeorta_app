import { describe, expect, it } from 'vitest';

import { EMPTY_DASH, formatDriveSummary, formatRelativeTime } from '../format';
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
