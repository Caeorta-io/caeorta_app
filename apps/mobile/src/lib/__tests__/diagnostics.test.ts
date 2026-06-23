import { describe, expect, it } from 'vitest';
import type { Tables } from '@caeorta/supabase';

import { sortDiagnosticsByPriority } from '../diagnostics';
import { mockDiagnostics } from '../data/mocks';

// Build a diagnostic by overriding a real fixture, so every required column is
// present without restating the whole row.
type Diagnostic = Tables<'diagnostic_outputs'>;
const base = mockDiagnostics[2] as Diagnostic; // the 'info' fixture
const make = (id: string, severity: string, generated_at: string): Diagnostic => ({
  ...base,
  id,
  severity,
  generated_at,
});

describe('sortDiagnosticsByPriority', () => {
  it('surfaces critical before warning before info, regardless of input order', () => {
    const input = [
      make('i', 'info', '2026-06-22T07:00:00.000Z'),
      make('c', 'critical', '2026-06-22T07:00:00.000Z'),
      make('w', 'warning', '2026-06-22T07:00:00.000Z'),
    ];
    expect(sortDiagnosticsByPriority(input).map((d) => d.severity)).toEqual([
      'critical',
      'warning',
      'info',
    ]);
  });

  it('orders most-recent generated_at first within a severity tier', () => {
    const older = make('c-old', 'critical', '2026-06-22T07:00:00.000Z');
    const newer = make('c-new', 'critical', '2026-06-22T09:00:00.000Z');
    expect(sortDiagnosticsByPriority([older, newer]).map((d) => d.id)).toEqual(['c-new', 'c-old']);
  });

  it('combines both rules: severity tier wins, recency breaks ties within a tier', () => {
    const input = [
      make('w', 'warning', '2026-06-22T09:00:00.000Z'),
      make('c-old', 'critical', '2026-06-22T07:00:00.000Z'),
      make('c-new', 'critical', '2026-06-22T08:00:00.000Z'),
    ];
    expect(sortDiagnosticsByPriority(input).map((d) => d.id)).toEqual(['c-new', 'c-old', 'w']);
  });

  it('sorts unknown severities after the known tiers', () => {
    const input = [
      make('x', 'catastrophic', '2026-06-22T09:00:00.000Z'),
      make('i', 'info', '2026-06-22T07:00:00.000Z'),
    ];
    expect(sortDiagnosticsByPriority(input).map((d) => d.severity)).toEqual([
      'info',
      'catastrophic',
    ]);
  });

  it('returns an empty array for empty input (the preview shows its empty state)', () => {
    expect(sortDiagnosticsByPriority([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [
      make('i', 'info', '2026-06-22T07:00:00.000Z'),
      make('c', 'critical', '2026-06-22T07:00:00.000Z'),
    ];
    const snapshot = input.map((d) => d.id);
    sortDiagnosticsByPriority(input);
    expect(input.map((d) => d.id)).toEqual(snapshot);
  });

  it('keeps the seeded fixtures critical → warning → info', () => {
    expect(sortDiagnosticsByPriority(mockDiagnostics).map((d) => d.severity)).toEqual([
      'critical',
      'warning',
      'info',
    ]);
  });
});
