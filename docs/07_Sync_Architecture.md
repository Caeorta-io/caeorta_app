# Sync Architecture

The Caeorta device records continuously to its SD card and syncs to the cloud opportunistically. This document defines how that sync works, because it touches firmware (owned elsewhere), platform (owned here), and app (owned here). The architecture must be coherent across all three.

---

## The model in one paragraph

The device always records telemetry to its SD card while driving, regardless of connectivity. When the user's phone hotspot is available (or any known Wi-Fi network), the device opportunistically uploads unsynced data to Supabase. The user can also manually trigger a sync from the app. The AI agent runs on completed drives, not live data. Live mode is an explicit user action — the app asks the device to start streaming current_state, the device wakes Wi-Fi, the app shows real-time values until the user exits live mode or the connection drops. Live data is not the default state of the product.

---

## The state machine — device side

Owned by the firmware project, but the app needs to know:

- **`idle`** — Device powered, not connected, periodically scanning for known Wi-Fi.
- **`connecting`** — Wi-Fi found, attempting connection.
- **`authenticating`** — Calling `mint_device_token` Edge Function to get a fresh JWT.
- **`syncing`** — Uploading data chunks to `device_sync_chunk` Edge Function.
- **`completing`** — Calling `device_sync_complete` to finalize the session.
- **`live_streaming`** — In live mode; upserting `current_state` every 1-2 seconds.
- **`error`** — Last operation failed; retrying with exponential backoff.

Transitions back to `idle` on completion, error after max retries, or user exit from live mode.

---

## The state machine — platform side (Edge Functions)

Owned here. These Edge Functions implement the device-facing API.

### `mint_device_token`
**Input:** `{ device_secret, device_id }`
**Auth:** None (the device_secret is the auth)
**Logic:** Verify device_secret matches device_id and device is claimed; mint a short-lived (15 min) JWT with `device_id` claim.
**Output:** `{ jwt, expires_at }`
**Errors:** 401 if secret doesn't match; 403 if device is unclaimed.

### `device_sync_start`
**Input:** `{ vehicle_id }`
**Auth:** Device JWT
**Logic:** Create a `sync_sessions` row with `status = 'pending'`; return session_id.
**Output:** `{ session_id }`

### `device_sync_chunk`
**Input:** `{ session_id, sequence_number, rows: [...telemetry rows], dtcs: [...new DTCs] }`
**Auth:** Device JWT (must match the device that started the session)
**Logic:**
- Verify session belongs to this device
- Verify sequence_number is the next expected (idempotency: duplicate sequence numbers ignored)
- Insert telemetry rows in a single batch
- Insert new DTCs (deduplicating against active DTCs)
- Update sync_sessions: `status = 'streaming'`, increment `bytes_uploaded` and `row_count`
- Return: `{ acked_sequence: sequence_number, next_expected: sequence_number + 1 }`

### `device_sync_complete`
**Input:** `{ session_id }`
**Auth:** Device JWT
**Logic:**
- Update sync_sessions: `status = 'completed'`, `completed_at = now()`
- Run drive boundary detection on inserted telemetry → create `drives` rows
- Update vehicle's `last_sync_at`
- Trigger the AI agent (via NOTIFY or webhook per agent contract)
- Return: `{ drives_created: int, dtcs_added: int }`

### `ota_check`
**Input:** `{ current_firmware_version }`
**Auth:** Device JWT
**Logic:** Look up device's `target_firmware_version`; if newer, return binary URL + checksum.
**Output:** `{ update_available: bool, target_version, binary_url, checksum }`

### `submit_wifi_credentials`
**Input:** `{ device_id, ssid, password }`
**Auth:** User JWT (the user owns the device)
**Logic:** Encrypt password, insert/update row in `device_wifi_credentials`, return success.
**Output:** `{ success: true }`

### `pair_device`
**Input:** `{ device_secret }`
**Auth:** User JWT
**Logic:**
- Verify device_secret matches a device in `unclaimed` status
- Atomically: set claimed_by_user_id = current user, claimed_at = now(), status = 'active'
- Write to audit_log
- Return device_id
**Output:** `{ device_id }`
**Errors:** 404 if no matching device; 409 if already claimed.

---

## The app side

The app's role in sync:

### Showing sync status
The app subscribes to `sync_sessions` rows for the user's vehicles via Realtime. When a session is `streaming`, the app shows: "Syncing your drive — N rows uploaded" with a progress indicator. When `completed`, the app shows the new drive in the list with a subtle "new" indicator.

### Manual sync trigger
The user taps "Sync now" in the app. This requires the device to be currently connected. App calls an Edge Function `request_device_sync` (to be built if manual sync is in v1) which writes a flag the device polls for. Alternative: the device waits for hotspot and the app guides the user to "Turn on hotspot to enable sync."

**Decision for v1:** simplest path is "device syncs when hotspot is on." App tells the user "Turn on hotspot to sync your latest drive." No explicit manual trigger.

### Live mode
When the user taps "Enable live mode":
1. App writes a row to `live_mode_requests` (table TBD) signaling the device
2. Device, on next Wi-Fi poll, sees the request, connects to user's hotspot, transitions to `live_streaming`
3. Device upserts `current_state` every 1-2 seconds
4. App subscribes to `current_state` for the vehicle, shows live values
5. User exits live mode → app updates the request row → device returns to `idle`

**Alternative simpler v1:** Live mode is implicitly active whenever the device is connected. No request mechanism. The device decides based on whether the app is open (signaled by recent activity). This is less precise but easier.

### First-sync experience
This is the moment of "first data" — the most important UX moment in the product.

When a user has never seen any drive:
- Show "Waiting for your first drive data" with friendly explanation
- After first sync completes, celebrate visually (subtle animation, "Welcome to Caeorta — here's your first drive")
- The agent should generate a special "welcome" diagnostic_output for the first drive (agreed with agent project)

### Long-delay sync experience
User drives for 2 weeks without enabling hotspot. When they finally sync, the SD card has a lot of data.

- App detects large sync via `sync_sessions.row_count` growing
- Shows "Large sync in progress — this may take a few minutes"
- Sync continues in background; app can be closed
- On completion, show "Welcome back! Here's a summary of your last 2 weeks"
- The agent generates a multi-drive summary (agreed with agent project)

### Sync failure handling
If `sync_sessions.status = 'failed'`:
- App shows an inline notice on the vehicle detail screen
- "Last sync failed — your data is safe on the device. We'll retry automatically."
- Tap for details → shows error_message + troubleshooting tips
- The device retries with backoff; usually self-recovers

---

## Sync protocol details (firmware contract)

This is the contract the firmware must follow:

### Chunking
- Each chunk contains at most 1000 telemetry rows or 100 KB, whichever is smaller
- Chunks are sent in order via sequence_number starting at 0
- Server acks each chunk; device only sends next after ack
- On timeout (10 seconds with no ack), retry with same sequence_number (idempotent)

### Resumability
- Device tracks `last_acked_sequence` per session in non-volatile storage
- If device reboots mid-sync, on next connection it queries the server for the session's current state and resumes from `next_expected`
- If session is older than 24 hours, abandon it and start a new session

### Compression
- Each chunk's `rows` field is gzipped before upload
- Server decompresses
- Reduces upload size significantly for telemetry data which has lots of repeating field names

### Authentication
- Device JWT obtained from `mint_device_token` is valid for 15 minutes
- Device refreshes proactively at 12 minutes
- If a chunk is rejected with 401, device refreshes and retries

### Data integrity
- Each chunk includes a SHA-256 of its decompressed payload
- Server verifies; rejects on mismatch
- Device logs the mismatch as a device_event for debugging

---

## Drive boundary detection

When a sync completes, the platform must split the synced telemetry into "drives."

**Algorithm (in `device_sync_complete`):**
1. Get all telemetry inserted in this sync, sorted by timestamp
2. A drive boundary is detected when:
   - There's a gap > 5 minutes between consecutive samples, OR
   - The ignition signal (if present in metrics) transitions from on to off
3. Group telemetry rows into drives
4. For each drive, compute:
   - started_at = first row's timestamp
   - ended_at = last row's timestamp
   - distance_km from GPS if available, else from speed×time integration
   - peak_metrics (max rpm, max boost, max coolant temp, etc.)
   - summary_metrics (averages, std devs)
5. Insert `drives` rows
6. The agent then processes these drives

---

## What can go wrong

### Hotspot drops mid-sync
Device retries automatically. Sync_sessions status may show as `streaming` for a while before resuming. App should treat this as normal, not raise alarm.

### Device clock is wrong
Telemetry timestamps may be in the past or future. Mitigation:
- Device uses NTP when first connecting to Wi-Fi
- Server adds `server_received_at` column alongside device-supplied `timestamp` (consider adding to schema if drift is a real problem)
- App displays based on device timestamps but with a "approximate" indicator if drift is large

### User's hotspot data plan caps
Sync uploads consume mobile data. A user with a limited plan may incur charges. Mitigation:
- App settings: "Only sync on home Wi-Fi" (device prioritizes that SSID)
- App shows estimated data usage in settings

### SD card full
Device telemetry stops being recorded if SD is full. Mitigation:
- Firmware implements rolling deletion of oldest unsynced data once SD is 95% full (with user warning surfaced in app)
- App shows "Device storage low — please sync" warning

### Sync conflicts (two devices, one vehicle)
Not possible in v1 (one device per vehicle). Schema supports it for v2.

---

## Future enhancements (not v1)

- **WebRTC peer-to-peer for live mode** — bypass server for live data, reducing latency and costs
- **Differential sync** — only upload metric values that changed (lossy compression)
- **Batched sync windows** — device decides when to sync based on time-of-day, battery state, etc.
- **Bluetooth low-power channel** — device pings the phone via BLE to wake up sync (when 4G isn't available)
