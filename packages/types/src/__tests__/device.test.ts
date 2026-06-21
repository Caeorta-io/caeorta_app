import { describe, expect, it } from 'vitest';

import {
  deviceSecretSchema,
  pairDeviceErrorBodySchema,
  pairDeviceErrorSchema,
  pairDeviceRequestSchema,
  pairDeviceSuccessSchema,
} from '../device';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('deviceSecretSchema', () => {
  it('trims surrounding whitespace (the QR/manual parse seam relies on this)', () => {
    expect(deviceSecretSchema.parse('  CAEORTA-TEST-SECRET-0001  ')).toBe('CAEORTA-TEST-SECRET-0001');
  });

  it('rejects empty / whitespace-only input', () => {
    expect(deviceSecretSchema.safeParse('').success).toBe(false);
    expect(deviceSecretSchema.safeParse('   ').success).toBe(false);
  });
});

describe('pairDeviceRequestSchema', () => {
  it('accepts a non-empty device_secret', () => {
    expect(pairDeviceRequestSchema.parse({ device_secret: 'abc' })).toEqual({ device_secret: 'abc' });
  });

  it('rejects a missing or empty device_secret', () => {
    expect(pairDeviceRequestSchema.safeParse({}).success).toBe(false);
    expect(pairDeviceRequestSchema.safeParse({ device_secret: '' }).success).toBe(false);
  });
});

describe('pairDeviceSuccessSchema', () => {
  it('accepts a uuid device_id', () => {
    expect(pairDeviceSuccessSchema.parse({ device_id: UUID })).toEqual({ device_id: UUID });
  });

  it('rejects a non-uuid device_id', () => {
    expect(pairDeviceSuccessSchema.safeParse({ device_id: 'nope' }).success).toBe(false);
  });
});

describe('pairDeviceErrorBodySchema', () => {
  it('parses the flat { error } wire shape', () => {
    expect(pairDeviceErrorBodySchema.parse({ error: 'Device not found' })).toEqual({
      error: 'Device not found',
    });
  });
});

describe('pairDeviceErrorSchema (discriminated on status)', () => {
  it('parses each known status variant', () => {
    const variants = [
      { status: 400 as const, code: 'invalid_request' as const, message: 'x' },
      { status: 401 as const, code: 'unauthorized' as const, message: 'x' },
      { status: 404 as const, code: 'not_found' as const, message: 'x' },
      { status: 409 as const, code: 'already_claimed' as const, message: 'x' },
      { status: 500 as const, code: 'server_error' as const, message: 'x' },
      { status: 'network' as const, code: 'network' as const, message: 'x' },
    ];
    for (const variant of variants) {
      expect(pairDeviceErrorSchema.parse(variant)).toEqual(variant);
    }
  });

  it('rejects an unknown status and a code that does not match its status', () => {
    expect(pairDeviceErrorSchema.safeParse({ status: 418, code: 'teapot', message: 'x' }).success).toBe(
      false,
    );
    expect(
      pairDeviceErrorSchema.safeParse({ status: 404, code: 'already_claimed', message: 'x' }).success,
    ).toBe(false);
  });
});
