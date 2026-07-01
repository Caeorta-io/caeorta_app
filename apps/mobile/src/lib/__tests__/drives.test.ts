import { describe, expect, it } from 'vitest';

import { mockDrives } from '@/lib/data/mocks';

import {
  buildDriveListItems,
  driveDateKey,
  formatDriveDateHeading,
  formatDriveTime,
} from '../drives';

describe('drive date helpers', () => {
  it('driveDateKey takes the UTC calendar date off the ISO timestamp', () => {
    expect(driveDateKey('2026-06-22T07:12:00.000Z')).toBe('2026-06-22');
    expect(driveDateKey('2026-06-18T23:59:59.000Z')).toBe('2026-06-18');
  });

  it('formatDriveDateHeading renders a human date, falling back to the raw key', () => {
    expect(formatDriveDateHeading('2026-06-22')).toBe('22 Jun 2026');
    expect(formatDriveDateHeading('2026-01-05')).toBe('5 Jan 2026');
    expect(formatDriveDateHeading('not-a-date')).toBe('not-a-date');
  });

  it('formatDriveTime renders zero-padded UTC HH:MM, dash for junk', () => {
    expect(formatDriveTime('2026-06-22T07:12:00.000Z')).toBe('07:12');
    expect(formatDriveTime('2026-06-21T19:20:00.000Z')).toBe('19:20');
    expect(formatDriveTime('nope')).toBe('–');
  });
});

describe('buildDriveListItems', () => {
  it('interleaves one header per calendar date, in the drives order given', () => {
    const items = buildDriveListItems(mockDrives);

    const headers = items.filter((item) => item.kind === 'header');
    const driveRows = items.filter((item) => item.kind === 'drive');

    // mockDrives spans four dates (Jun 22 / 21 / 19 / 18), newest-first.
    expect(headers.map((h) => (h.kind === 'header' ? h.label : ''))).toEqual([
      '22 Jun 2026',
      '21 Jun 2026',
      '19 Jun 2026',
      '18 Jun 2026',
    ]);
    // Every drive is preserved as a row; no drive is dropped or duplicated.
    expect(driveRows).toHaveLength(mockDrives.length);
    // The list opens with a header (headers precede their group's rows).
    expect(items[0]?.kind).toBe('header');
  });

  it('emits exactly one header for consecutive same-date drives', () => {
    const sameDay = mockDrives.filter((d) => driveDateKey(d.started_at) === '2026-06-21');
    const items = buildDriveListItems(sameDay);
    expect(items.filter((item) => item.kind === 'header')).toHaveLength(1);
    expect(items.filter((item) => item.kind === 'drive')).toHaveLength(sameDay.length);
  });

  it('returns an empty array for no drives', () => {
    expect(buildDriveListItems([])).toEqual([]);
  });
});
