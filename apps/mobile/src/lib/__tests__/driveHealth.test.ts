import { describe, expect, it } from 'vitest';
import type { Tables } from '@caeorta/supabase';

import { deriveDriveHealth, driveHealthFromFlags } from '../driveHealth';
import { mockDiagnostics } from '../data/mocks';

// Build a diagnostic by overriding a real fixture, so every required column is
// present without restating the whole row (same pattern as diagnostics.test.ts).
type Diagnostic = Tables<'diagnostic_outputs'>;
const base = mockDiagnostics[2] as Diagnostic; // the 'info' fixture
const withSeverity = (id: string, severity: string): Diagnostic => ({ ...base, id, severity });

describe('deriveDriveHealth', () => {
  it('returns clean for zero diagnostics', () => {
    expect(deriveDriveHealth([])).toBe('clean');
  });

  it('elevates to check_now when any critical is present', () => {
    const diagnostics = [
      withSeverity('i', 'info'),
      withSeverity('w', 'warning'),
      withSeverity('c', 'critical'),
    ];
    expect(deriveDriveHealth(diagnostics)).toBe('check_now');
  });

  it('critical wins even when it is not the newest or first row', () => {
    // Order must not matter — the rule is presence, not position.
    expect(deriveDriveHealth([withSeverity('c', 'critical')])).toBe('check_now');
    expect(deriveDriveHealth([withSeverity('w', 'warning'), withSeverity('c', 'critical')])).toBe(
      'check_now',
    );
  });

  it('elevates to needs_look for warning without critical', () => {
    expect(deriveDriveHealth([withSeverity('w', 'warning')])).toBe('needs_look');
    expect(deriveDriveHealth([withSeverity('i', 'info'), withSeverity('w', 'warning')])).toBe(
      'needs_look',
    );
  });

  it('info alone does not elevate health above clean', () => {
    expect(deriveDriveHealth([withSeverity('i', 'info')])).toBe('clean');
  });

  it('insufficient_data never elevates health (off the ladder, §4.3)', () => {
    // The key case: a drive whose only diagnostic is insufficient_data reads clean,
    // NOT needs_look/check_now.
    expect(deriveDriveHealth([withSeverity('x', 'insufficient_data')])).toBe('clean');
    expect(
      deriveDriveHealth([withSeverity('x', 'insufficient_data'), withSeverity('i', 'info')]),
    ).toBe('clean');
  });

  it('an unrecognised severity is treated defensively and does not elevate', () => {
    expect(deriveDriveHealth([withSeverity('u', 'catastrophic')])).toBe('clean');
  });

  it('does not mutate the input array', () => {
    const input = [withSeverity('c', 'critical'), withSeverity('w', 'warning')];
    const snapshot = input.map((d) => d.id);
    deriveDriveHealth(input);
    expect(input.map((d) => d.id)).toEqual(snapshot);
  });
});

describe('driveHealthFromFlags', () => {
  it('maps the flag pairs to the three tiers (critical wins over warning)', () => {
    expect(driveHealthFromFlags({ hasCritical: true, hasWarning: true })).toBe('check_now');
    expect(driveHealthFromFlags({ hasCritical: true, hasWarning: false })).toBe('check_now');
    expect(driveHealthFromFlags({ hasCritical: false, hasWarning: true })).toBe('needs_look');
    expect(driveHealthFromFlags({ hasCritical: false, hasWarning: false })).toBe('clean');
  });
});
