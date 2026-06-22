import {
  ESPSecurity,
  ESPTransport,
} from '@orbital-systems/react-native-esp-idf-provisioning';

/**
 * The single configurable seam for Wi-Fi provisioning security. Everything the
 * ESP-IDF session handshake needs to be parameterized lives here, in one typed
 * object, so that when firmware ratifies the real values it is a one-file change
 * and nothing downstream has guessed values baked in.
 *
 * ⚠️ FIRMWARE-GATED — NONE OF THESE ARE RATIFIED YET. No Caeorta device speaks
 * the provisioning protocol today (the V1 prototype has Wi-Fi creds hardcoded +
 * flashed). The values below are *placeholders to compile and exercise the flow
 * against the published standard*, not a committed security posture:
 *
 *   - `pop` is intentionally `null` — we do NOT invent or hardcode a
 *     proof-of-possession. The real PoP (and where the app obtains it: device
 *     label, pairing response, or out-of-band) is a TODO the firmware track owns.
 *   - `security` is a provisional default, not a locked choice. ESP-IDF Security 2
 *     (SRP6a) is the modern recommendation, but the firmware decides the actual
 *     level — and the level is coupled to PoP/username (Security 1 needs a PoP;
 *     Security 2 needs a username + PoP). Until both are ratified together, the
 *     live handshake will not authenticate, which is expected and out of this
 *     work's DoD (on-device E2E is firmware-gated).
 *
 * See `docs/07_Sync_Architecture.md` (provisioning) and the PR's "Carries
 * forward" section for the ratification checklist.
 */
export interface ProvisioningSecurityConfig {
  /** ESP-IDF session security scheme. PROVISIONAL — firmware ratifies. */
  readonly security: ESPSecurity;
  /**
   * Proof-of-possession. `null` = none configured yet.
   * TODO(firmware): supply the real PoP source; do not hardcode a value here.
   */
  readonly pop: string | null;
  /**
   * Username for Security 2 (SRP6a). `null` until Security 2 + PoP are ratified.
   * TODO(firmware): set alongside `pop` when `security === ESPSecurity.secure2`.
   */
  readonly username: string | null;
}

export const PROVISIONING_SECURITY: ProvisioningSecurityConfig = {
  security: ESPSecurity.secure2,
  pop: null,
  username: null,
};

/** SoftAP-only for v1 (Android-only pilot; no BLE provisioning path). */
export const PROVISIONING_TRANSPORT: ESPTransport = ESPTransport.softap;

/**
 * Match pattern for the device's SoftAP SSID. The app uses this to identify a
 * Caeorta device when scanning. PLACEHOLDER — the real broadcast SSID shape is
 * owned by the firmware/hardware track.
 * TODO(firmware): replace with the ratified SSID pattern.
 */
export const SOFTAP_SSID_PATTERN = /^CAEORTA-/;

/**
 * Prefix handed to the ESP SDK's `searchESPDevices(devicePrefix, …)`. Derived
 * from {@link SOFTAP_SSID_PATTERN}; kept as its own constant because the SDK
 * takes a plain string prefix, not a regex. TODO(firmware): keep in sync.
 */
export const SOFTAP_SSID_PREFIX = 'CAEORTA-';

/** Per-step time budget before a provisioning step is treated as a timeout. */
export const PROVISIONING_TIMEOUT_MS = 30_000;
