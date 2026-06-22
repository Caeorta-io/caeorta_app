import {
  ESPProvisionManager,
  type ESPDevice,
} from '@orbital-systems/react-native-esp-idf-provisioning';
import {
  espStatusResponseSchema,
  mapProvisioningError,
  mapProvisionStatus,
  wifiCredentialsSchema,
  type ProvisioningResult,
  type WifiCredentials,
} from '@caeorta/types';

import {
  PROVISIONING_SECURITY,
  PROVISIONING_TIMEOUT_MS,
  PROVISIONING_TRANSPORT,
  SOFTAP_SSID_PATTERN,
  SOFTAP_SSID_PREFIX,
} from '@/lib/provisioningConfig';

// ⚠️ FIRMWARE-GATED. No Caeorta device speaks the ESP-IDF provisioning protocol
// yet, so the live wire path here cannot succeed end-to-end today — by design
// (see provisioningConfig.ts and the PR's DoD). This module is built to the
// published standard and its *result mapping* is unit-tested in `@caeorta/types`;
// the orchestration below is typed and compiles into the dev build, ready for the
// real device once firmware adopts the same standard.
//
// Credentials never leave the phone here: they go straight to the device over its
// local SoftAP. There is NO cloud storage of creds in onboarding —
// `submit_wifi_credentials` is intentionally not called.

/**
 * Wraps a native promise in our own timeout. The ESP native module does not take
 * an AbortSignal, so we can't truly cancel the in-flight call — `withTimeout`
 * only stops *us* from waiting and surfaces a `timeout` result; the native op may
 * still complete in the background. The rejected message is shaped so
 * {@link mapProvisioningError} buckets it as `timeout`.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/**
 * Hands the user's hotspot SSID + password to a Caeorta device over its local
 * SoftAP using the standard ESP-IDF `wifi_provisioning` flow:
 *
 *   1. search  — find the device broadcasting a Caeorta SoftAP SSID
 *   2. connect — establish the secure session (security/PoP seam, firmware-gated)
 *   3. provision — send SSID + password and read back the device's connect status
 *
 * Never throws. Every outcome — including transport faults, the session handshake
 * failing, and our own timeout — collapses onto a discriminated
 * {@link ProvisioningResult} the UI branches on by `reason`. The device session
 * is always torn down in `finally`.
 *
 * @param input Raw `{ ssid, password }`; validated at this boundary with Zod.
 */
export async function provisionWifiCredentials(
  input: WifiCredentials,
): Promise<ProvisioningResult> {
  const parsed = wifiCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    // Shouldn't happen (the form validates first), but keep the boundary honest.
    return { reason: 'wifi-auth-failed', message: 'Invalid Wi-Fi credentials' };
  }
  const { ssid, password } = parsed.data;

  // --- 1. search for the device on its SoftAP -----------------------------
  let device: ESPDevice;
  try {
    const devices = await withTimeout(
      ESPProvisionManager.searchESPDevices(
        SOFTAP_SSID_PREFIX,
        PROVISIONING_TRANSPORT,
        PROVISIONING_SECURITY.security,
      ),
      PROVISIONING_TIMEOUT_MS,
      'search',
    );
    const match = devices.find((d) => SOFTAP_SSID_PATTERN.test(d.name));
    if (!match) {
      return { reason: 'device-not-found', message: 'No Caeorta device found on its setup network' };
    }
    device = match;
  } catch (err) {
    return mapProvisioningError(err, 'search');
  }

  try {
    // --- 2. establish the secure session (security/PoP seam) --------------
    try {
      await withTimeout(
        // softAPPassword is the device AP's own password (assumed open for v1, so
        // null); pop/username come from the firmware-gated security config.
        device.connect(PROVISIONING_SECURITY.pop, null, PROVISIONING_SECURITY.username),
        PROVISIONING_TIMEOUT_MS,
        'connect',
      );
    } catch (err) {
      return mapProvisioningError(err, 'connect');
    }

    // --- 3. send the credentials and read back the connect result --------
    try {
      const raw = await withTimeout(
        device.provision(ssid, password),
        PROVISIONING_TIMEOUT_MS,
        'provision',
      );
      const status = espStatusResponseSchema.safeParse(raw);
      if (!status.success) {
        // Reached the device but couldn't understand its response — a comms fault.
        return { reason: 'network', message: 'Unrecognized response from device' };
      }
      return mapProvisionStatus(status.data.status, device.name);
    } catch (err) {
      return mapProvisioningError(err, 'provision');
    }
  } finally {
    // disconnect() is synchronous and best-effort; never let it mask a result.
    try {
      device.disconnect();
    } catch {
      // ignore — the flow's outcome is already decided
    }
  }
}
