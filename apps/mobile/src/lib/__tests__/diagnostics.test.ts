import { describe, expect, it } from 'vitest';
import type { Tables } from '@caeorta/supabase';

import {
  deriveDiagnosticCardState,
  sortDiagnosticsByPriority,
  usesCriticalAcknowledgeLabel,
} from '../diagnostics';
import { mockDiagnostics, mockOtherDriveDiagnostics } from '../data/mocks';

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

// Build a card-state input by overriding a real fixture, so `category` + `severity`
// are always a coherent pair unless the test deliberately mismatches them.
const cardBase = mockDiagnostics[2] as Diagnostic; // the 'info' / 'engine' fixture
const withState = (category: string, severity: string): Pick<Diagnostic, 'category' | 'severity'> => ({
  ...cardBase,
  category,
  severity,
});

describe('deriveDiagnosticCardState', () => {
  it('maps each on-ladder severity to its state', () => {
    expect(deriveDiagnosticCardState(withState('engine', 'info'))).toBe('info');
    expect(deriveDiagnosticCardState(withState('cooling', 'warning'))).toBe('warning');
    expect(deriveDiagnosticCardState(withState('turbo', 'critical'))).toBe('critical');
  });

  it("returns 'insufficient_data' when the CATEGORY is insufficient_data (contract shape)", () => {
    // docs/06 "I don't know" path: category='insufficient_data', severity='info'.
    expect(deriveDiagnosticCardState(withState('insufficient_data', 'info'))).toBe(
      'insufficient_data',
    );
  });

  it("returns 'insufficient_data' when the SEVERITY is insufficient_data (app's sentinel shape)", () => {
    // The existing mocks / driveHealth model it as a severity sentinel; recognise it.
    expect(deriveDiagnosticCardState(withState('engine', 'insufficient_data'))).toBe(
      'insufficient_data',
    );
  });

  it('lets insufficient_data (either field) win over a higher severity/category', () => {
    // Off-ladder must never be pulled back onto the ladder by the other field.
    expect(deriveDiagnosticCardState(withState('insufficient_data', 'critical'))).toBe(
      'insufficient_data',
    );
    expect(deriveDiagnosticCardState(withState('turbo', 'insufficient_data'))).toBe(
      'insufficient_data',
    );
  });

  it('falls back to info for an unrecognised severity (never throws)', () => {
    expect(deriveDiagnosticCardState(withState('engine', 'catastrophic'))).toBe('info');
    expect(deriveDiagnosticCardState(withState('engine', ''))).toBe('info');
  });

  it('derives the four states from the real fixtures', () => {
    expect(deriveDiagnosticCardState(mockDiagnostics[0] as Diagnostic)).toBe('critical');
    expect(deriveDiagnosticCardState(mockDiagnostics[1] as Diagnostic)).toBe('warning');
    expect(deriveDiagnosticCardState(mockDiagnostics[2] as Diagnostic)).toBe('info');
    // …671 is warning; …672 is the insufficient_data fixture.
    expect(deriveDiagnosticCardState(mockOtherDriveDiagnostics[1] as Diagnostic)).toBe(
      'insufficient_data',
    );
  });
});

describe('usesCriticalAcknowledgeLabel', () => {
  it('is true only for the critical state', () => {
    expect(usesCriticalAcknowledgeLabel('critical')).toBe(true);
    expect(usesCriticalAcknowledgeLabel('warning')).toBe(false);
    expect(usesCriticalAcknowledgeLabel('info')).toBe(false);
    expect(usesCriticalAcknowledgeLabel('insufficient_data')).toBe(false);
  });
});
