import { describe, expect, it } from 'vitest';

import { createVehicleInputSchema, VEHICLE_YEAR_BOUNDS } from '../vehicle';

const UUID = '22222222-2222-4222-8222-222222222222';

const valid = {
  make: 'Toyota',
  model: 'GR Corolla',
  year: 2023,
  nickname: 'Project Hachi',
  ecu_type: 'denso-gen4',
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
    expect(createVehicleInputSchema.safeParse({ ...valid, ecu_type: 'a'.repeat(61) }).success).toBe(
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
});
