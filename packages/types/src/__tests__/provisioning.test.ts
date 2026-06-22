import { describe, expect, it } from 'vitest';

import {
  espStatusResponseSchema,
  espWifiListSchema,
  mapProvisioningError,
  mapProvisionStatus,
  normalizeProvisioningError,
  provisioningResultSchema,
  wifiCredentialsSchema,
} from '../provisioning';

describe('wifiCredentialsSchema', () => {
  it('accepts a normal hotspot ssid + password', () => {
    expect(wifiCredentialsSchema.parse({ ssid: 'MyHotspot', password: 'hunter2pass' })).toEqual({
      ssid: 'MyHotspot',
      password: 'hunter2pass',
    });
  });

  it('allows an empty password (open network) but not an empty ssid', () => {
    expect(wifiCredentialsSchema.safeParse({ ssid: 'Open', password: '' }).success).toBe(true);
    expect(wifiCredentialsSchema.safeParse({ ssid: '', password: 'x' }).success).toBe(false);
  });

  it('rejects an ssid over 32 octets or a password over 63 chars', () => {
    expect(wifiCredentialsSchema.safeParse({ ssid: 'a'.repeat(33), password: 'x' }).success).toBe(
      false,
    );
    expect(wifiCredentialsSchema.safeParse({ ssid: 'a', password: 'x'.repeat(64) }).success).toBe(
      false,
    );
  });
});

describe('espStatusResponseSchema', () => {
  it('accepts the { status } shape', () => {
    expect(espStatusResponseSchema.parse({ status: 'success' })).toEqual({ status: 'success' });
  });

  it('rejects a missing/non-string status', () => {
    expect(espStatusResponseSchema.safeParse({}).success).toBe(false);
    expect(espStatusResponseSchema.safeParse({ status: 1 }).success).toBe(false);
  });
});

describe('espWifiListSchema', () => {
  it('parses a scanned network list (optional bssid/channel)', () => {
    const list = [
      { ssid: 'Home', rssi: -40, auth: 3 },
      { ssid: 'Guest', rssi: -70, auth: 6, bssid: 'aa:bb', channel: 11 },
    ];
    expect(espWifiListSchema.parse(list)).toEqual(list);
  });

  it('rejects an item missing required fields', () => {
    expect(espWifiListSchema.safeParse([{ ssid: 'x' }]).success).toBe(false);
  });
});

describe('provisioningResultSchema (discriminated on reason)', () => {
  it('parses each variant', () => {
    const variants = [
      { reason: 'success' as const, deviceName: 'CAEORTA-ABC' },
      { reason: 'device-not-found' as const, message: 'x' },
      { reason: 'wrong-pop' as const, message: 'x' },
      { reason: 'wifi-auth-failed' as const, message: 'x' },
      { reason: 'timeout' as const, message: 'x' },
      { reason: 'network' as const, message: 'x' },
    ];
    for (const v of variants) {
      expect(provisioningResultSchema.parse(v)).toEqual(v);
    }
  });

  it('rejects an unknown reason and a success without deviceName', () => {
    expect(provisioningResultSchema.safeParse({ reason: 'nope', message: 'x' }).success).toBe(false);
    expect(provisioningResultSchema.safeParse({ reason: 'success' }).success).toBe(false);
  });
});

describe('mapProvisionStatus', () => {
  it('maps a success-ish status to success carrying the device name', () => {
    for (const status of ['success', 'Connected', 'wifi applied', 'provisioned']) {
      expect(mapProvisionStatus(status, 'CAEORTA-1')).toEqual({
        reason: 'success',
        deviceName: 'CAEORTA-1',
      });
    }
  });

  it('maps any other status to wifi-auth-failed (device reached the hotspot, creds rejected)', () => {
    const r = mapProvisionStatus('auth error', 'CAEORTA-1');
    expect(r.reason).toBe('wifi-auth-failed');
    if (r.reason === 'wifi-auth-failed') expect(r.message).toContain('auth error');
  });
});

describe('normalizeProvisioningError', () => {
  it('extracts message + lowercased code and flags aborts', () => {
    expect(normalizeProvisioningError({ message: 'boom', code: 'E_POP' })).toEqual({
      message: 'boom',
      code: 'e_pop',
      aborted: false,
    });
    expect(normalizeProvisioningError({ name: 'AbortError', message: 'aborted' }).aborted).toBe(true);
    expect(normalizeProvisioningError('plain string').message).toBe('plain string');
  });
});

describe('mapProvisioningError', () => {
  it('treats an abort/timeout as timeout regardless of phase', () => {
    expect(mapProvisioningError({ name: 'AbortError', message: 'x' }, 'connect').reason).toBe('timeout');
    expect(mapProvisioningError(new Error('request timed out'), 'provision').reason).toBe('timeout');
  });

  it('search failures bucket to device-not-found, transport words to network', () => {
    expect(mapProvisioningError(new Error('no devices'), 'search').reason).toBe('device-not-found');
    expect(mapProvisioningError(new Error('socket unreachable'), 'search').reason).toBe('network');
  });

  it('connect failures split between wrong-pop, device-not-found and network', () => {
    expect(mapProvisioningError(new Error('proof of possession mismatch'), 'connect').reason).toBe(
      'wrong-pop',
    );
    expect(mapProvisioningError({ code: 'SESSION_FAILED', message: 'x' }, 'connect').reason).toBe(
      'wrong-pop',
    );
    expect(mapProvisioningError(new Error('peripheral not found'), 'connect').reason).toBe(
      'device-not-found',
    );
    expect(mapProvisioningError(new Error('something odd'), 'connect').reason).toBe('network');
  });

  it('provision failures bucket to wifi-auth-failed, unknown to network', () => {
    expect(mapProvisioningError(new Error('wrong password'), 'provision').reason).toBe(
      'wifi-auth-failed',
    );
    expect(mapProvisioningError(new Error('ssid not found'), 'provision').reason).toBe(
      'wifi-auth-failed',
    );
    expect(mapProvisioningError(new Error('weird internal'), 'provision').reason).toBe('network');
  });

  it('always returns a schema-valid result (totality)', () => {
    const phases = ['search', 'connect', 'provision'] as const;
    for (const phase of phases) {
      const r = mapProvisioningError(new Error('anything at all'), phase);
      expect(provisioningResultSchema.safeParse(r).success).toBe(true);
    }
  });
});
