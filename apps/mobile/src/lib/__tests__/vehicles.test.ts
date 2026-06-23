import { afterEach, describe, expect, it } from 'vitest';

import { createVehicle } from '../vehicles';
import { DATA_SOURCE } from '../data/source';

const validInput = {
  make: 'Toyota',
  model: 'GR Corolla',
  year: 2023,
  nickname: 'Project Hachi',
  ecu_type: 'denso-gen4',
  device_id: '22222222-2222-4222-8222-222222222222',
};

afterEach(() => {
  // Tests below flip the write capability to 'live'; restore the default so the
  // shared module map doesn't leak across tests.
  DATA_SOURCE.createVehicle = 'mock';
});

describe('createVehicle (orchestrator)', () => {
  it('returns validation_error with field messages for a missing required field', async () => {
    const result = await createVehicle({ ...validInput, make: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation_error');
    if (result.error.code !== 'validation_error') return;
    const makeErrors = result.error.fieldErrors.make;
    expect(makeErrors).toBeDefined();
    expect(makeErrors ?? []).not.toHaveLength(0);
  });

  it('returns validation_error for a year out of range', async () => {
    const result = await createVehicle({ ...validInput, year: 1900 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation_error');
    if (result.error.code !== 'validation_error') return;
    expect(result.error.fieldErrors.year).toBeDefined();
  });

  it('does not throw on unparseable input — it returns a validation_error', async () => {
    const result = await createVehicle(undefined);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation_error');
  });

  it('mock-path success returns a conforming vehicles row carrying the input', async () => {
    const result = await createVehicle(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { vehicle } = result;
    // Carries the user input…
    expect(vehicle.make).toBe('Toyota');
    expect(vehicle.model).toBe('GR Corolla');
    expect(vehicle.year).toBe(2023);
    expect(vehicle.nickname).toBe('Project Hachi');
    expect(vehicle.ecu_type).toBe('denso-gen4');
    expect(vehicle.device_id).toBe(validInput.device_id);
    // …and is a complete, db-shaped row.
    expect(typeof vehicle.id).toBe('string');
    expect(typeof vehicle.owner_user_id).toBe('string');
    expect(typeof vehicle.created_at).toBe('string');
    expect(vehicle.vin).toBeNull();
    expect(vehicle.modifications).toEqual([]);
  });

  it('maps a thrown seam error (live not-implemented) onto network', async () => {
    DATA_SOURCE.createVehicle = 'live';
    const result = await createVehicle(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('network');
  });
});
