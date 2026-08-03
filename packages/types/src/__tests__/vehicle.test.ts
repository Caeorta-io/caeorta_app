import { describe, expect, it } from 'vitest';

import {
  createVehicleInputSchema,
  ECU_TYPES,
  encodeModifications,
  MAX_MODIFICATIONS_LENGTH,
  VEHICLE_YEAR_BOUNDS,
} from '../vehicle';

const UUID = '22222222-2222-4222-8222-222222222222';

const valid = {
  make: 'Toyota',
  model: 'GR Corolla',
  year: 2023,
  nickname: 'Project Hachi',
  ecu_type: 'haltech',
  device_id: UUID,
};

describe('createVehicleInputSchema', () => {
  it('accepts a fully-populated valid input', () => {
    expect(createVehicleInputSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an empty or missing required field', () => {
    expect(createVehicleInputSchema.safeParse({ ...valid, make: '' }).success).toBe(false);
    const withoutNickname: Record<string, unknown> = { ...valid };
    delete withoutNickname.nickname;
    expect(createVehicleInputSchema.safeParse(withoutNickname).success).toBe(false);
  });

  it('enforces the field length bounds', () => {
    expect(createVehicleInputSchema.safeParse({ ...valid, make: 'a'.repeat(101) }).success).toBe(
      false,
    );
    expect(createVehicleInputSchema.safeParse({ ...valid, nickname: 'a'.repeat(61) }).success).toBe(
      false,
    );
  });

  it('rejects a year below the floor, above the ceiling, or non-integer', () => {
    expect(createVehicleInputSchema.safeParse({ ...valid, year: 1979 }).success).toBe(false);
    expect(
      createVehicleInputSchema.safeParse({ ...valid, year: VEHICLE_YEAR_BOUNDS.max + 1 }).success,
    ).toBe(false);
    expect(createVehicleInputSchema.safeParse({ ...valid, year: 2023.5 }).success).toBe(false);
    expect(createVehicleInputSchema.safeParse({ ...valid, year: VEHICLE_YEAR_BOUNDS.max }).success).toBe(
      true,
    );
  });

  it('requires device_id to be a uuid', () => {
    expect(createVehicleInputSchema.safeParse({ ...valid, device_id: 'not-a-uuid' }).success).toBe(
      false,
    );
  });

  it('exposes year bounds with min = 1980 and max = currentYear + 1', () => {
    expect(VEHICLE_YEAR_BOUNDS.min).toBe(1980);
    expect(VEHICLE_YEAR_BOUNDS.max).toBe(new Date().getUTCFullYear() + 1);
  });

  // ── ecu_type: required + enum-constrained ──────────────────────────────────
  // The set below is not a client-side choice — it mirrors the CHECK constraint in
  // supabase/migrations/20260602130000_initial_schema.sql. If these ever diverge, the
  // client accepts values the database will reject on insert.

  it('accepts every value in the canonical ECU set', () => {
    for (const ecuType of ECU_TYPES) {
      const result = createVehicleInputSchema.safeParse({ ...valid, ecu_type: ecuType });
      expect(result.success, `expected ecu_type '${ecuType}' to be accepted`).toBe(true);
    }
  });

  it('pins the canonical ECU set to the migration CHECK constraint', () => {
    expect([...ECU_TYPES]).toEqual(['oem', 'haltech', 'aem', 'motec', 'link', 'other']);
  });

  it('rejects a missing ecu_type — the agent needs it from drive one', () => {
    const withoutEcu: Record<string, unknown> = { ...valid };
    delete withoutEcu.ecu_type;
    expect(createVehicleInputSchema.safeParse(withoutEcu).success).toBe(false);
  });

  it('rejects an empty, unknown, or wrongly-cased ecu_type', () => {
    for (const bad of ['', 'denso-gen4', 'OEM', 'Haltech', 'ecutek']) {
      const result = createVehicleInputSchema.safeParse({ ...valid, ecu_type: bad });
      expect(result.success, `expected ecu_type '${bad}' to be rejected`).toBe(false);
    }
  });

  it('reports a missing ecu_type under its own field key so the form can highlight it', () => {
    const withoutEcu: Record<string, unknown> = { ...valid };
    delete withoutEcu.ecu_type;
    const result = createVehicleInputSchema.safeParse(withoutEcu);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.ecu_type).toBeDefined();
  });

  // ── modifications: optional, bounded, jsonb-encoded ────────────────────────

  it('accepts input with modifications omitted, and with a note present', () => {
    expect(createVehicleInputSchema.safeParse(valid).success).toBe(true);
    expect(
      createVehicleInputSchema.safeParse({ ...valid, modifications: 'Stage 2, catback' }).success,
    ).toBe(true);
  });

  it('bounds the modifications note', () => {
    expect(
      createVehicleInputSchema.safeParse({
        ...valid,
        modifications: 'a'.repeat(MAX_MODIFICATIONS_LENGTH),
      }).success,
    ).toBe(true);
    expect(
      createVehicleInputSchema.safeParse({
        ...valid,
        modifications: 'a'.repeat(MAX_MODIFICATIONS_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it('encodes modifications into the jsonb column shape, defaulting to {}', () => {
    expect(encodeModifications('Stage 2, catback')).toEqual({ notes: 'Stage 2, catback' });
    // Trimmed, and whitespace-only collapses to the column default rather than
    // persisting an empty note the agent would read as meaningful.
    expect(encodeModifications('  Stage 2  ')).toEqual({ notes: 'Stage 2' });
    expect(encodeModifications('   ')).toEqual({});
    expect(encodeModifications('')).toEqual({});
    expect(encodeModifications(undefined)).toEqual({});
  });
});
