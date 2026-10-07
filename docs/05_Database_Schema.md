# Database Schema (v1)

The platform founder owns schema. This document is the human-readable companion to the migration SQL files in `supabase/migrations/`. When schema changes, **both update together in the same PR**.

## Design principles

1. **Postgres-native.** Use Postgres types (uuid, timestamptz, jsonb, generated columns, partial indexes, RLS) rather than fighting the database.
2. **RLS-enforced.** Row-level security is the source of truth for authorization. No "trust the client" patterns.
3. **Append-mostly for telemetry.** Time-series data is rarely updated; design for fast inserts.
4. **Devices write via Edge Functions, not directly.** Devices never have an anon key or service role. They get short-lived JWTs minted by `mint_device_token`.
5. **Audit-friendly.** Sensitive operations (device claims, transfers) write to `audit_log`.
6. **Schema-ready for v2 community features.** Community tables exist (empty) so v2 doesn't require destructive migrations.

## Tables

### Auth + Identity

#### `users`
Extends Supabase `auth.users` with profile data.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK to auth.users.id |
| display_name | text | Optional |
| phone | text | Optional in v1 (email magic link auth); required in v2 |
| locale | text | Default 'en' |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Auto-updated via trigger |

#### `user_preferences`
Per-user app settings.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PK, FK to users.id |
| notification_severity_threshold | text | 'info' \| 'warning' \| 'critical' (which severities get push notifications) |
| quiet_hours_start | time | e.g. '22:00' |
| quiet_hours_end | time | e.g. '07:00' |
| timezone | text | e.g. 'Asia/Kolkata' |
| units_preference | jsonb | { speed: 'kph'\|'mph', temp: 'c'\|'f', pressure: 'bar'\|'psi' } |
| updated_at | timestamptz | |

### Device

#### `devices`
The physical OBD-II dongles.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| device_secret | text | Unique. Printed on label as QR. Never exposed via API. |
| claimed_by_user_id | uuid | Nullable; FK to users.id |
| claimed_at | timestamptz | When claimed |
| last_seen_at | timestamptz | Updated on every device action |
| firmware_version | text | Current version reported by device |
| target_firmware_version | text | Set by ops; device polls and updates |
| last_sync_at | timestamptz | Last successful sync completion |
| hardware_revision | text | e.g. 'v2-esp32c3' |
| status | text | 'unclaimed' \| 'active' \| 'disabled' \| 'lost' |
| created_at | timestamptz | When device was provisioned at factory |

#### `device_wifi_credentials`
Stored Wi-Fi networks per device. Multiple allowed; device picks one available.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| device_id | uuid | FK |
| ssid | text | |
| encrypted_password | text | Encrypted via pgcrypto or Supabase Vault |
| priority | int | Lower = preferred |
| added_at | timestamptz | |

#### `device_events`
Append-only log of device actions for debugging.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| device_id | uuid | FK |
| event_type | text | 'boot' \| 'sync_start' \| 'sync_complete' \| 'ota_start' \| 'ota_complete' \| 'error' \| 'wifi_connected' \| etc. |
| timestamp | timestamptz | |
| payload | jsonb | Event-specific data (error code, version numbers, etc.) |

Indexed on `(device_id, timestamp DESC)`.

#### `firmware_versions`
Available firmware versions for OTA.

| Column | Type | Notes |
|---|---|---|
| version | text | PK, e.g. '2.1.3' |
| binary_url | text | Supabase Storage signed URL |
| checksum | text | SHA-256 |
| release_notes | text | |
| is_active | bool | False to retire a version |
| created_at | timestamptz | |

#### `device_push_tokens`
Expo push tokens per user device (phone), not Caeorta device.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| token | text | Expo push token |
| platform | text | 'ios' \| 'android' |
| created_at | timestamptz | |
| last_used_at | timestamptz | |

Unique index on `(user_id, token)`.

### Vehicle

#### `vehicles`
A car owned by a user, paired with a device.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_user_id | uuid | FK |
| device_id | uuid | FK; one device per vehicle in v1 |
| make | text | e.g. 'Maruti' |
| model | text | e.g. 'Swift' |
| year | int | e.g. 2016 |
| vin | text | Read from OBD |
| nickname | text | User-chosen, e.g. "My Daily" |
| ecu_type | text | `CHECK (ecu_type IN ('oem','haltech','aem','motec','link','other'))` — enforced in the DB since the initial schema. Nullable in Postgres, but **required at the application layer** (Zod `z.enum(ECU_TYPES)` + the add-vehicle form). Note `database.types.ts` renders this as `string \| null`: the generator does not represent CHECK constraints, so the generated type is not evidence the column is unconstrained. |
| modifications | jsonb | Free-form; itemize in v2. Written as `{"notes": "<user text>"}` by `create_vehicle`, or `{}` when blank. Read by the agent as LLM prose context — deterministic code keys on `ecu_type` instead. |
| created_at | timestamptz | |

**Write path.** Clients cannot insert into `vehicles` directly (`vehicles_no_direct_insert`). Vehicles are created by the `create_vehicle` Edge Function using the service role. The function is **built and contract-conformant on `main`**: first version `1dc0589` (2026-07-08), brought into conformance by `16f082c` (2026-08-04), and verified end to end against a local stack on 2026-09-30. The wire contract, and what remains before the app's live flip, are in `docs/create_vehicle_contract.md`. Which build dev serves has not been checked from this repo. The app still serves a mock: `DATA_SOURCE.createVehicle` follows `ENV_DEFAULT` (`'mock'` unless `EXPO_PUBLIC_DATA_SOURCE=live`), and its `'live'` branch returns `notImplemented`.

> *(Until 2026-10-05 this was a ⚠️ Platform-track note: "a `create_vehicle` Edge Function is planned for v1. Once it lands, update this section to document the new write-path alongside `vehicles_no_direct_insert`. The App-track add-vehicle screen (Week 3) is built against this function's contract; the function itself is Sulaiman's to build." The function landed on 2026-07-08 and the note was not updated.)*

#### `vehicle_modifications`
Empty in v1; reserved for v2 community features (itemized mod tracking).

### Telemetry

#### `telemetry`
Raw OBD data. The heavy table.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vehicle_id | uuid | FK |
| sync_session_id | uuid | FK |
| drive_id | uuid | FK, nullable, `ON DELETE SET NULL`. Set by `device_sync_complete` during drive segmentation; NULL for rows predating the association. Consumers must tolerate NULL |
| timestamp | timestamptz | When the sample was taken on the car (not when uploaded) |
| metrics | jsonb | { rpm: 2450, coolant_temp_c: 87, ... } |

Indexed on `(vehicle_id, timestamp DESC)`, `(drive_id) WHERE drive_id IS NOT NULL`, `(sync_session_id, timestamp)`, and `(drive_id, timestamp)`.

**Partitioning strategy:** consider partitioning by week if volume warrants it (likely not at pilot scale). Add `pg_cron` job at Week 4 to downsample telemetry older than 30 days into per-minute aggregates.

#### `current_state`
Single row per vehicle. Upserted by device during live mode.

| Column | Type | Notes |
|---|---|---|
| vehicle_id | uuid | PK |
| latest_metrics | jsonb | Same shape as telemetry.metrics |
| updated_at | timestamptz | |

#### `sync_sessions`
A single sync attempt from device to cloud.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| device_id | uuid | FK |
| vehicle_id | uuid | FK |
| started_at | timestamptz | |
| completed_at | timestamptz | Null until completion |
| status | text | 'pending' \| 'streaming' \| 'completed' \| 'failed' |
| bytes_uploaded | bigint | |
| row_count | int | |
| error_message | text | Null on success |

**Completion is transactional (since 2026-10-07, migration `20261007000001`).** `device_sync_complete` no longer writes `drives`, `telemetry.drive_id` and `status` as separate requests. It calls **`public.complete_sync_session(p_session_id uuid, p_device_id uuid, p_drives jsonb) RETURNS jsonb`**.

In one transaction, that function:
1. locks the session row (`FOR UPDATE`, scoped to the device);
2. returns `{outcome: 'already_completed'}` if the session is already completed;
3. inserts the drives, taking `vehicle_id` / `sync_session_id` from the locked row and `has_anomaly = false`;
4. backfills `telemetry.drive_id` with one `UPDATE … WHERE sync_session_id = … AND timestamp BETWEEN started_at AND ended_at` per drive;
5. sets `status = 'completed'`, `completed_at = now()` and `error_message = NULL`;
6. returns `{outcome: 'completed', drives_created}`. An unknown session or device returns `{outcome: 'not_found'}`.

It **raises, rolling everything back**, if:
- `p_drives` is not an array;
- a drive's time range is invalid;
- drives overlap or are out of order;
- a drive matches no telemetry.

The overlap and no-match checks are what keep the per-range backfill exact.

What this guarantees:
- `sync_session_completed_enqueue` fires inside the same transaction, so a routine agent job exists **iff** the drives committed.
- Overlapping calls are serialised by the lock, and only one inserts.

Security: `SECURITY DEFINER`, `search_path = public, pg_temp`, EXECUTE revoked from PUBLIC, `anon` and `authenticated` explicitly, and granted to **`service_role` only**. Verified locally: anon gets `permission denied`.

After a rolled-back call, the Edge Function writes `status = 'failed'` best-effort (never over `completed`) for the app's failure banner. See `docs/07` § `device_sync_complete`.

### Diagnostics

#### `dtcs`
Diagnostic Trouble Codes from the ECU.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vehicle_id | uuid | FK |
| sync_session_id | uuid | FK; sync that surfaced this DTC |
| code | text | e.g. 'P0107' |
| description | text | OEM/known description |
| severity_raw | text | As reported by ECU |
| first_seen_at | timestamptz | |
| last_seen_at | timestamptz | |
| is_active | bool | False if cleared |
| cleared_at | timestamptz | |
| cleared_by_user_id | uuid | If user marked as cleared |

#### `diagnostic_outputs`
**The contract table with the AI agent project.** AI agent writes here; app reads.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vehicle_id | uuid | FK |
| agent_version | text | e.g. 'v0.3.2' |
| generated_at | timestamptz | |
| severity | text | 'info' \| 'warning' \| 'critical' |
| urgency | text | 'now' \| 'soon' \| 'monitor' |
| category | text | 'engine' \| 'fuel' \| 'cooling' \| 'transmission' \| 'electrical' \| 'turbo' \| 'insufficient_data' \| 'other' |
| title | text | Short, e.g. "Lean condition under boost detected" |
| summary | text | 1-2 sentences |
| explanation | text | Paragraph or more |
| recommended_action | text | What the user should do |
| confidence | numeric(3,2) | 0.00 to 1.00 |
| referenced_telemetry_ids | uuid[] | Telemetry rows this output references |
| referenced_dtc_ids | uuid[] | |
| referenced_drive_id | uuid | The drive being analyzed |
| referenced_telemetry_snapshot | jsonb | Nullable. Cited telemetry samples copied inline at write time, so a diagnostic keeps its evidence after the 30-day raw-telemetry purge. Shape is contract-pinned — see `docs/AI_Agent_Contract/ai-agent-contract.md` §5. NULL means the row predates this column; an empty snapshot and an absent one are different states |
| status | text | 'new' \| 'seen' \| 'dismissed' \| 'actioned' |

Indexed on `(vehicle_id, generated_at DESC)` and `(vehicle_id, status)`.

#### `diagnostic_feedback`
User's thumbs up/down on diagnostic outputs. **Critical for the AI agent project's eval loop.**

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| diagnostic_id | uuid | FK to diagnostic_outputs |
| user_id | uuid | FK |
| rating | text | 'up' \| 'down' |
| comment | text | Optional |
| created_at | timestamptz | |

#### `agent_status`
Per-vehicle status of the AI agent. App subscribes to this for "analyzing your drive" UI.

| Column | Type | Notes |
|---|---|---|
| vehicle_id | uuid | PK |
| status | text | 'idle' \| 'analyzing' \| 'error' \| 'rate_limited' |
| updated_at | timestamptz | |
| last_run_at | timestamptz | |
| error_message | text | Null if not in error state |

### Drives

#### `drives`
The unit of analysis. Drive = ignition-on to ignition-off period.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vehicle_id | uuid | FK |
| started_at | timestamptz | |
| ended_at | timestamptz | |
| distance_km | numeric | Computed by `device_sync_complete` (since 2026-10-05) by trapezoidal integration of `speed_kph` over time, 2 dp. Intervals touching a sample without `speed_kph`, and intervals longer than 30 s, are skipped, so it is a lower bound when samples are missing. **NULL = unknown** (fewer than two adjacent samples with speed), **0 = stationary**; these are different claims. Rows created before 2026-10-05 stay NULL. The per-100km denominator for agent baselining. Contract §9 / §12 D1 |
| duration_seconds | int | |
| average_speed_kph | numeric | **Always NULL today, never written.** Ruling 2026-10-05: **drop the column.** It duplicates `summary_metrics.speed_kph`, which `device_sync_complete` already computes. Lands in a later migration, after the app stops reading it (`LastDriveCard.tsx`, `drives/[driveId].tsx`, `mocks.ts`, `conformance.test.ts`); update this row in that PR. Contract §9 / §12 D2 |
| peak_metrics | jsonb | { max_rpm: 6800, max_boost_bar: 1.4, ... } |
| summary_metrics | jsonb | { avg_coolant_temp_c: 88, avg_afr: 14.6, ... } |
| sync_session_id | uuid | FK |
| has_anomaly | bool | Quick-filtering flag. **App-derived, never written by the agent** — a trigger on `diagnostic_outputs` INSERT sets it true when a drive-scoped output has severity 'warning' or 'critical'. One-way: nothing ever unsets it |

Indexed on `(vehicle_id, started_at DESC)`.

Inserted only through `complete_sync_session()` (see `sync_sessions` above), which makes a duplicate drive unreachable through the sync path. **There is no UNIQUE constraint** besides the PK. A unique `(sync_session_id, started_at)` index was considered and deferred on 2026-10-07: dev and prod may already hold duplicates from the pre-RPC handler, and that must be checked read-only before such an index could be added.

### Community (empty in v1, schema ready for v2)

These tables exist with proper FKs but have no UI and no Edge Functions yet. They're here to avoid a destructive migration when community features ship in v2.

- `posts` — user posts in community feed
- `comments` — comments on posts
- `groups` — model-specific or interest groups
- `group_members` — many-to-many user<->group
- `events` — car meets, track days
- `event_attendees` — many-to-many user<->event

Detailed schema deferred to v2 planning.

### Operational

#### `feedback`
General user feedback / bug reports.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| type | text | 'bug' \| 'feature' \| 'other' |
| message | text | |
| app_version | text | |
| device_info | jsonb | OS, model, etc. |
| created_at | timestamptz | |

#### `app_versions`
Version gating. App queries on launch to check if forced update needed.

| Column | Type | Notes |
|---|---|---|
| version | text | PK part, e.g. '1.0.5'. Composite PK with `platform` so the same version can ship on both stores. |
| platform | text | PK part. 'ios' \| 'android' |
| is_supported | bool | False = force update |
| force_update_below_this | bool | True = block app launch below this version |
| release_notes | text | |
| released_at | timestamptz | |

#### `audit_log`
Append-only log of sensitive operations.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| actor_user_id | uuid | Who performed it |
| action | text | e.g. 'device.claimed', 'device.transferred', 'user.deleted' |
| target_type | text | e.g. 'device', 'user' |
| target_id | uuid | |
| metadata | jsonb | |
| timestamp | timestamptz | |

No update policy. Append-only.

## RLS Philosophy

Three actors interact with the database:

1. **Authenticated user (app + admin)** — has a `auth.users.id`. Can read/write their own data only.
2. **Service role (Edge Functions)** — bypasses RLS. Used for cross-user operations like pairing.
3. **Device (via minted JWT)** — has a `device_id` claim. Can write only to telemetry, sync_sessions, dtcs, current_state, device_events scoped to its own device_id.

Sample RLS pattern for `vehicles`:

```sql
-- Users can read their own vehicles
CREATE POLICY "users_select_own_vehicles" ON vehicles
  FOR SELECT USING (owner_user_id = auth.uid());

-- Users can update their own vehicles
CREATE POLICY "users_update_own_vehicles" ON vehicles
  FOR UPDATE USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- No direct INSERT — only via Edge Functions
CREATE POLICY "no_direct_insert" ON vehicles
  FOR INSERT WITH CHECK (false);
```

Sample RLS pattern for `telemetry`:

```sql
-- Users can read telemetry for their own vehicles
CREATE POLICY "users_select_own_telemetry" ON telemetry
  FOR SELECT USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE owner_user_id = auth.uid()
    )
  );

-- Devices can insert telemetry for their own vehicle
CREATE POLICY "devices_insert_own_telemetry" ON telemetry
  FOR INSERT WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN devices d ON d.id = v.device_id
      WHERE d.id::text = auth.jwt() ->> 'device_id'
    )
  );
```

## Indexing strategy

Add indexes only when query patterns demand them. Indexes (kept current; add new indexes here in the same PR that creates them):

- `telemetry (vehicle_id, timestamp DESC)`
- `telemetry (drive_id) WHERE drive_id IS NOT NULL`
- `telemetry (sync_session_id, timestamp)`
- `telemetry (drive_id, timestamp)`
- `diagnostic_outputs (vehicle_id, generated_at DESC)`
- `diagnostic_outputs (vehicle_id, status)`
- `dtcs (vehicle_id, is_active, last_seen_at DESC)`
- `drives (vehicle_id, started_at DESC)`
- `devices (device_secret)` UNIQUE
- `devices (claimed_by_user_id)`
- `device_events (device_id, timestamp DESC)`
- `device_push_tokens (user_id, token)` UNIQUE
- `sync_sessions (device_id, started_at DESC)`

Review query plans monthly during pilot. Add indexes for slow queries; remove unused ones.

## Extensions

Enable in v1:
- `pgcrypto` — for password hashing if needed, encryption helpers
- `pg_cron` — for scheduled jobs (downsampling, cleanup)
- `pgvector` — for future embeddings (not used in v1 but cheap to enable)
- `pg_trgm` — for fuzzy text search (useful for admin search)

## Migration discipline

- Every schema change = one migration file.
- File naming: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Migrations are immutable once applied. Never edit an applied migration; write a new one.
- **Verify locally first.** `npx supabase start`, then `npx supabase db reset`, which applies every migration in `supabase/migrations/` and then loads `seed.sql` and `seed_dtc_lookup.sql`. The local stack is where a migration is verified before it goes anywhere shared. *(Added 2026-09-30. Before `supabase/config.toml` landed in PR #61 there was no local stack, and this list went straight to "apply to dev" — dev was the verification environment.)*
- Then apply to dev with `supabase db push --linked`
- Promote to prod manually after dev verification (see **Promoting a migration to prod** below).
- Generate TS types after every migration: `supabase gen types typescript --linked > packages/supabase/database.types.ts`
- Update `docs/schema.md` (this file) in the same PR

### Promoting a migration to prod

1. Confirm the migration has been on dev for at least 24 hours (use this as a smoke window for any RLS or trigger interactions to surface).
2. Run `supabase link --project-ref <prod-ref>` (the prod ref is in 1Password; link only when promoting, then unlink).
3. `supabase db push --linked --dry-run` and read the entire output. STOP if anything looks wrong (extra DROPs, unexpected ALTERs).
4. If the migration adds policies or triggers, mentally simulate: "does this change behavior for any currently-running query?" Document the conclusion in the prod-promotion entry of the workdiary.
5. `supabase db push --linked`
6. Re-link back to dev: `supabase link --project-ref <dev-ref>`.
7. Regenerate types from dev to keep `packages/supabase/src/database.types.ts` in sync (no-op if dev and prod schemas are identical, which they should be after promotion).
8. Workdiary entry: log the prod promotion with date, migration filename, and any anomalies observed.

### Tracking dev-only state across weeks

A migration applied to dev but not yet promoted to prod is "dev-only." Week N+1 work that depends on a migration must verify dev-only vs prod-promoted state. The Action Plan's week-end Definition of Done implicitly assumes prod-promoted; in practice, prod promotion has often slipped by 1-3 days. Workdiary entries should note both states for any migration touched in that session.

**Migration promotion status — current statement (2026-10-05).** The repo cannot observe dev or prod. Everything below is either the repo's own record (migration files, workdiary) or a dated audit, and each claim says which.

- **On `main`:** 18 migrations, `20260602125801` through `20260812000003` (`ls supabase/migrations/`). All 18 apply cleanly on a local `npx supabase db reset` (session 45, 2026-09-30).
- **Dev:** the 2026-09-30 dev-drift audit compared dev with a database built from the migration set. It found zero type or nullability mismatches, and found dev's history holding `20260804000004` (applied in dev 2026-08-06; its file was recreated on `main` by PR #63). Every lag difference traced to **the three `20260812*` migrations not yet applied to dev**. That is a schema comparison, consistent with dev having everything through `20260804000005`; it is not a read of dev's full migration history. No push to dev has been recorded since. Whether dev has changed since 2026-09-30 is not knowable from the repo. The audit also did not capture `column_default`. Treat dev as three migrations behind `main` until a push is logged.
- **Prod:** the only recorded promotion is the three Week-1 migrations (2026-06-21, block below). Step 8 of the ritual requires a workdiary entry for every promotion, and there is none since. On the repo's record, then, prod holds 3 of 18, with **15 outstanding** (`20260614000001` onward). That is inferred from the absence of a log entry, not observed. Promoting in sequence now means `notify_agent` is created by `20260614000001` and dropped again by `20260804000005`; it is not a live object anywhere the full set has been applied. See `docs/11` CF-17.

**Migration promotion status — historical record** (updated 2026-06-21; superseded by the statement above on 2026-10-05, kept as written):

The three Week 1 v1 migrations are applied to **both dev and prod** as of 2026-06-21:
- Extensions migration (`20260602125801`) — dev ✓, prod ✓ (was PR #4)
- Initial schema migration (`20260602130000`) — dev ✓, prod ✓ (was PR #6, reconciled via PR #11)
- RLS policies migration (`20260602150000`) — dev ✓, prod ✓ (was PR #8, reconciled via PR #11)

Prod promotion was verified the same day: 4 extensions (pgcrypto, pg_cron, pg_trgm, vector), 26 tables, 36 indexes, RLS enabled on all 26 tables, and the two fixture-free RLS isolation tests (anon→`vehicles` and authenticated→`audit_log`) both return 0 rows, matching dev.

**Still outstanding (dev-only):**
- `20260614000001_add_notify_agent` (Week 5) — applied on dev, NOT on prod
- `20260614000002_add_pg_cron_jobs` (Week 5) — applied on dev, NOT on prod

These two Week 5 migrations were deliberately excluded from the 2026-06-21 promotion (that session was scoped to the three Week 1 migrations). Promote them in a follow-up prod-link session per the procedure above, once the corresponding Week 4/5 Edge Functions are confirmed ready for prod. Note: `add_pg_cron_jobs` schedules nightly jobs that begin running the moment the migration is applied — confirm that's intended before promoting.

## Supabase Dashboard configuration (operational, not in migrations)

Some Supabase configuration lives outside migrations — in the Dashboard UI under Project Settings, Auth Providers, Email Templates, and similar. This config must be replicated manually when promoting to prod, since it doesn't ship via migrations. Keep this checklist current as new Dashboard-side config is added.

> TODO: extract to `docs/supabase-dashboard-config.md` if this section grows past one screen, or when prod Auth setup adds more items than dev currently has.

### Auth — Email OTP code-only configuration

Default Supabase Auth email behavior is "send a magic link with an embedded token." Code-only OTP delivery (the v1 decision per CLAUDE.md) requires three Dashboard-side changes per project (dev configured 2026-06-09; prod still pending):

1. **Authentication → Email Templates → Magic Link template**: replace the link with `{{ .Token }}` so the email contains only the 6-digit code, not a clickable URL.
2. **Authentication → Providers → Email → Confirm email**: set to OFF. Otherwise new users get a confirm-email link before they can sign in, defeating the OTP flow.
3. **Authentication → Providers → Email → Email OTP Length**: change from 8 (default) to 6 digits, matching the verify screen's input length.

Note: even after these settings, Supabase may still emit both code and link in some templates. The mobile app only reads the code, so this is cosmetic-only. If a pilot user reports confusion, revisit template wording then.

### Auth — Email rate limiting (free tier)

The default Supabase email infrastructure throttles aggressively on free tier. During session 11's testing the rate limit was hit during retries. For pilot launch (Week 11), switch to Resend custom SMTP via Authentication → Providers → Email → SMTP Settings. Resend credits are cheap; the rate limit becomes a non-issue. Until then, expect occasional throttling during dev — it's expected, not a bug.

## Data retention

- `telemetry` — raw data: 30 days. Older data downsampled to per-minute aggregates and retained 1 year.
- `device_events` — 90 days.
- `sync_sessions` — 1 year (small, useful for debugging).
- `diagnostic_outputs` — indefinitely (small, important user history).
- `audit_log` — indefinitely.

`pg_cron` jobs handle the cleanup. Defined in a migration.

## Backups

Supabase free tier does not include automatic backups. Until upgraded, Sulaiman (Platform founder, owns Supabase admin access) runs weekly `pg_dump` to a private encrypted backup location.

When upgraded to Supabase Pro (after pilot, before commercial launch), enable automatic point-in-time recovery.

## Testing

The RLS migration (PR #8) is verified against a 12-step pg-side isolation suite. Tests are currently run manually via `supabase db query --linked -f <file>` against the dev project — the Management API runs each invocation against a role that bypasses RLS, so each test impersonates a target role with `SET LOCAL ROLE` + `set_config('request.jwt.claims', …, true)` inside a transaction, captures the result into a temp table, then `RESET ROLE` and selects from the temp table at the end. The Dashboard SQL editor can run the same scripts (founder action) when the CLI path is unavailable.

> **Note, 2026-09-30.** The paragraph above and the "Today:" lines below describe how the suite was run when it was written — against the dev project, because there was no local stack. A local stack now exists (`npx supabase start` + `npx supabase db reset`) and is the verification environment for migrations. **This suite has not been re-run there**, and it cannot run on the local seed as-is: `supabase/seed.sql` creates one user, not the three fixture users (`<u1>` / `<u2>` / `<u3>`) the suite assumes. Treat the results recorded here as dev results from the PR #8 era, not as a current local result.
>
> **Update, 2026-10-07 (session 50).** The local seed now has **two** users, each with one vehicle (see Test fixtures). The three-user assumption is **still not satisfiable**. Tests 1–3 can be run in substance with `<u1>` = `63f09c52-…`, `<u2>` = `…0102`, but the expected values must be re-pointed: the nicknames are `Test Swift` / `Fixture i20`, not `user1 car` / `user2 car`. Test 12 would see 2 vehicles, not 3. A `<u3>` would need a third fixture user and vehicle. The suite has still not been run or rewritten.

The suite assumes the fixtures from the **Test fixtures** section below (three test users with UUIDs `<u1>` / `<u2>` / `<u3>`, one vehicle each with ids `<v1>` / `<v2>` / `<v3>`). When the suite is automated (see Test fixtures → when to build), it lands as `supabase/tests/rls.sql` and runs via `supabase test db` or a CI job.

### Authenticated-user scoping

1. **`user1 SELECT vehicles` — owner-scope visibility**
   - Verifies: an authenticated user sees only their own vehicles via `vehicles_select_own` (`USING (owner_user_id = auth.uid())`).
   - Today:
     ```sql
     SET LOCAL ROLE authenticated;
     PERFORM set_config('request.jwt.claims',
       '{"sub":"<u1>","role":"authenticated"}', true);
     SELECT count(*), string_agg(nickname, ',') FROM public.vehicles;
     -- expect: count=1, names='user1 car'
     ```
   - Automation: same query in `supabase/tests/rls.sql`; assertion via `pgtap` or a `RAISE EXCEPTION` if the expected shape doesn't match.

2. **`user2 SELECT vehicles` — owner-scope visibility (second user, to rule out single-user-only false positives)**
   - Verifies: scoping is per-user, not "show first user".
   - Today: identical to test 1 with `sub="<u2>"`, expect `nickname='user2 car'`.
   - Automation: parameterized loop over the three fixture users.

3. **`user1 SELECT users` — own profile only**
   - Verifies: `users_select_own` (`USING (id = auth.uid())`) hides other users' rows.
   - Today:
     ```sql
     SET LOCAL ROLE authenticated;
     PERFORM set_config('request.jwt.claims',
       '{"sub":"<u1>","role":"authenticated"}', true);
     SELECT count(*), max(display_name) FROM public.users;
     -- expect: count=1, name='rls test 1'
     ```

### Direct-INSERT blocks (Edge-Function-only writes)

4. **`user1 direct INSERT vehicles` — blocked**
   - Verifies: `vehicles_no_direct_insert` (`WITH CHECK (false)`) prevents direct user inserts. INSERT path lives in `pair_device` Edge Function (service role).
   - Today:
     ```sql
     SET LOCAL ROLE authenticated;
     PERFORM set_config('request.jwt.claims',
       '{"sub":"<u1>","role":"authenticated"}', true);
     INSERT INTO public.vehicles (owner_user_id, nickname)
     VALUES ('<u1>', 'should fail');
     -- expect: ERROR new row violates row-level security policy
     ```
   - Automation: wrap in `BEGIN … EXCEPTION WHEN OTHERS THEN … END` and assert the exception fired with the expected `SQLERRM`.

5. **`user1 cross-owner INSERT vehicles` — blocked**
   - Verifies: even spoofing `owner_user_id` to another user's id doesn't bypass `WITH CHECK (false)`. Covers an attempt to write to another user's namespace via owner spoofing.
   - Today: same as test 4 but `VALUES ('<u2>', 'cross-owner hijack')`; expect the same RLS error.

6. **`authenticated INSERT firmware_versions` — blocked**
   - Verifies: `firmware_versions` has no INSERT policy, so RLS denies the insert. Writes are ops-only via service role.
   - Today:
     ```sql
     SET LOCAL ROLE authenticated;
     PERFORM set_config('request.jwt.claims',
       '{"sub":"<u1>","role":"authenticated"}', true);
     INSERT INTO public.firmware_versions (version, binary_url, checksum)
     VALUES ('99.0.0', 'https://example.com/fake', 'fake');
     -- expect: ERROR new row violates row-level security policy
     ```

### Cross-user write attempts

7. **`user1 cross-user UPDATE` — returns 0 rows**
   - Verifies: `vehicles_update_own` `USING (owner_user_id = auth.uid())` hides user2's vehicle from user1's UPDATE scope. The UPDATE doesn't error; it simply matches no rows.
   - Today:
     ```sql
     SET LOCAL ROLE authenticated;
     PERFORM set_config('request.jwt.claims',
       '{"sub":"<u1>","role":"authenticated"}', true);
     WITH upd AS (
       UPDATE public.vehicles SET nickname='HIJACK' WHERE id='<v2>' RETURNING id
     )
     SELECT count(*) FROM upd;
     -- expect: 0
     ```
   - Automation: same query; assert the result is exactly 0 (positive count = test fails — the row was visible and updatable).

### Anon-role gating

8. **`anon SELECT app_versions` — allowed**
   - Verifies: `app_versions_select_public` (`TO authenticated, anon USING (true)`) allows pre-login force-update checks.
   - Today:
     ```sql
     SET LOCAL ROLE anon;
     SELECT count(*) FROM public.app_versions;
     -- expect: succeeds (rows >= 0)
     ```
   - Automation: assert no exception; row count irrelevant.

9. **`anon SELECT vehicles` — 0 rows**
   - Verifies: no `vehicles` policy has `anon` in its `TO` list, so RLS denies the read entirely (returns 0 rows, no error).
   - Today: `SET LOCAL ROLE anon; SELECT count(*) FROM public.vehicles;` → expect 0.

### Deny-all on service-role-only tables

10. **`authenticated SELECT audit_log` — 0 rows**
    - Verifies: `audit_log` has RLS enabled with no policies; non-service-role roles get nothing.
    - Today:
      ```sql
      SET LOCAL ROLE authenticated;
      PERFORM set_config('request.jwt.claims',
        '{"sub":"<u1>","role":"authenticated"}', true);
      SELECT count(*) FROM public.audit_log;
      -- expect: 0
      ```

11. **`authenticated SELECT posts` — 0 rows (community deny-all)**
    - Verifies: v2 community placeholders (`posts`, `comments`, `groups`, `group_members`, `events`, `event_attendees`) have RLS enabled with no policies as defense-in-depth; deny-all for authenticated/anon until v2 ships UI + policies.
    - Today: same as test 10 with `FROM public.posts`; expect 0.

### Service-role bypass

12. **`service-role/migration sees all 3 vehicles` — RLS bypass**
    - Verifies: the migration role (or `service_role`, used by Edge Functions) bypasses RLS entirely. Critical for confirming that Edge-Function write paths (`pair_device`, `device_sync_*`, etc.) won't be blocked once they exist.
    - Today: with no `SET ROLE` (the default `supabase db query --linked` role), `SELECT count(*) FROM public.vehicles` returns 3.
    - Automation: TODO once we extend the test suite to cover every service-role-only INSERT path table-by-table (currently only `vehicles` is asserted via bypass; expanding to every service-role-only table is a Week-2 task once `supabase/tests/rls.sql` exists).

### Deferred until Week 2 infrastructure exists

The following classes of test require infrastructure that doesn't exist yet; they are explicitly listed here so we don't forget:

- **Device-JWT INSERT/UPSERT paths** (`telemetry`, `current_state`, `sync_sessions`, `dtcs`, `device_events`): need `mint_device_token` to issue a JWT with a `device_id` claim. Once available, test that the device JWT can write only to its own vehicle's rows and cannot cross-vehicle insert.
- **`current_state` UPSERT semantics under device JWT**: paired INSERT-WITH-CHECK + UPDATE-USING + UPDATE-WITH-CHECK policies must all pass for `INSERT … ON CONFLICT DO UPDATE`. Testable end-to-end only when a real device JWT exists.
- **`agent_role` read-only verification**: TODO until the AI Agent Contract v0 lands and the role is created in a follow-up migration.
  *Status 2026-10-05: the precondition is met, but the verification has **not** been run.* The role is created by `supabase/migrations/20260804000001_create_agent_role.sql` (on `main`; in dev per the 2026-09-30 audit). The local record is narrower than "verified":
  - Session 44 (2026-09-29) showed that the migration set, which includes `20260804000001`, applies cleanly on a local `db reset` (17 migrations; 18 from session 45).
  - Session 44 also exercised the `has_anomaly` trigger.
  - **No session has run a `SET ROLE agent_role` check.** That would cover reads returning rows under its `USING (true)` policies, writes refused outside `diagnostic_outputs` / `agent_status` / `agent_work_queue`, and the `vehicle_modifications` revoke from `20260812000003`.

  The item stays TODO. It is runnable locally now, since no dev connection is needed.

  *Update 2026-10-07 (session 50): the **read half** has now run locally.* The run used `supabase_admin` over TCP, because `postgres` holds `agent_role` with `set_option = f` and cannot `SET ROLE` to it. Inside `BEGIN; SET LOCAL ROLE agent_role; … COMMIT;`, the counts matched the superuser exactly on every table agent_role reads:

  | Table | Count |
  |---|---|
  | `telemetry` | 5401 |
  | `drives` | 3 |
  | `vehicles` | 2 |
  | `sync_sessions` | 3 |
  | `current_state` | 2 |
  | `dtcs` | 5 |
  | `diagnostic_outputs` | 3 |
  | `diagnostic_feedback` | 3 |
  | `agent_work_queue` | 2 |
  | `agent_status` | 0 |

  There were no silent zeros. `current_state`, `dtcs` and `diagnostic_feedback` were empty until the session-50 seed, which is why this could not be proven earlier. `agent_status` is still unseeded, so its read remains unproven (0 = 0). **Still not run:** the write refusals outside `diagnostic_outputs` / `agent_status` / `agent_work_queue`, and the `vehicle_modifications` revoke.

## Test fixtures

**Current state (2026-09-30):** `supabase/seed.sql` exists and loads automatically on a local `npx supabase db reset`, after all migrations, followed by `seed_dtc_lookup.sql` (both are listed in `supabase/config.toml`). That local reset is the known-good state to verify against. The seed creates its own `auth.users` row before the `public.users` row that references it (PR #61) — without that, a reset on an empty local database failed on `users_id_fkey`. *Contents until 2026-10-07:* one user, one vehicle, two unclaimed devices, two drives and 361 telemetry rows.

**Current contents (2026-10-07, session 50).** These are row counts after `npx supabase db reset --local`. They were verified identical across two resets and across two direct re-applies of `seed.sql` on a populated database. Fixture ids are fixed `00000000-0000-0000-0000-0000000000NN`, banded by table. Docs and sessions cite them by number, so never renumber them.

| Table | Rows | What they are |
|---|---|---|
| `auth.users` / `users` | 2 / 2 | User 1 `63f09c52-…` (`pilot1@example.test`, the real dev uuid). User 2 `…0102` (`pilot2@example.test`). Both have `ON CONFLICT DO NOTHING` and stay out of the teardown. |
| `devices` | 5 | One `create_vehicle` branch each (see below). |
| `vehicles` | 2 | `…0010` user 1 on device `…0001`. `…0011` user 2 on device `…0005`. |
| `sync_sessions` | 4 | `…0020` completed, 361 rows. `…0021` completed, 2,520 rows. `…0022` **streaming**, 2,520 rows, unprocessed. `…0023` **streaming**, 180 rows, unprocessed, vacuum-only (added session 52). |
| `drives` | 3 | `…0030` has_anomaly true. `…0031` clean; it is the has_anomaly trigger test's flip target. `…0032` is the large drive, with `distance_km` / `average_speed_kph` NULL and `peak_metrics` `'{}'`. |
| `telemetry` | 5,581 | 361 at 5 s, plus 2 × 2,520 at 1 Hz (42 min), plus 180 at 1 Hz (…0023). |
| `current_state` | 2 | One per vehicle. |
| `dtcs` | 5 | Active critical / active `WARN` / history-cleared `info` / history-inactive NULL severity (user 1), plus active critical (user 2). All are real `dtc_lookup` codes. Three carry `freeze_frame_metrics` in the contract §3 keys. |
| `diagnostic_outputs` | 3 | Warning on `…0030`, info on `…0032`, vehicle-scoped critical on `…0011`. |
| `diagnostic_feedback` | 3 | One per output, both ratings, both users. |
| `agent_work_queue` | 2 | Trigger side effect, not seeded directly. `dtc_active_enqueue` fires on the 3 active DTCs and dedupes to one pending `dtc` job per vehicle. |
| `dtc_lookup` | 52 | From `seed_dtc_lookup.sql`. |
| `firmware_versions` / `app_versions` | 2 / 1 | Unchanged. |

**Devices.** `create_vehicle` checks in order: exists, owner, active, no existing vehicle.
- `…0001`: unclaimed, but holds `…0010`. This is a pre-existing inconsistency kept as-is, and `mint_device_token` refuses it.
- `…0002`: unclaimed and free, for the `pair_device` happy path. Through `create_vehicle` it returns `not_device_owner`. `device_not_claimed` is returned only for an id that does not exist.
- `…0003`: user 1, active, free. Returns 201 as user 1 and `not_device_owner` as user 2.
- `…0004`: user 1, `disabled`. Returns `device_not_active`.
- `…0005`: user 2, active, holds `…0011`. Returns `duplicate_vehicle` as user 2 and `not_device_owner` as user 1.

**The large drives exist to defeat row-count caps.** Both session-49 defects only appear past ~1,000 rows: the `max_rows = 1000` fetch truncation and the `drive_id` backfill `URI too long`. Both large sessions share one generated profile:
- a cold start, with coolant rising from 24 °C to ~91 °C and boost at ≈ −68 kPa vacuum;
- stop-and-go city driving;
- 300 samples with `speed_kph` **absent**, with timestamps still contiguous;
- highway driving with a wide-open-throttle pull (boost to 120 kPa, rpm to 6,100);
- a coast down to idle.

Boost is negative in 1,130 samples per session.
- `…0021` / `…0032` is the **processed** state, with `drive_id` set on all rows. Use it for read paths at volume.
- `…0022` is the **unprocessed** state. Running `device_sync_complete` against it, with device `…0005`, is the regression test for the write path.
- Expected result for `…0022`: one drive and a `distance_km` of **29.41**. That is trapezoidal integration over 2,218 intervals, with the absent stretch contributing nothing. A truncated fetch reports far less. The function's actual output, confirmed in sessions 50 and 52: `distance_km` 29.41, `duration_seconds` 2519, `summary_metrics.speed_kph` 47.73 (42.05 would mean absent speed read as 0), peak boost 120, and all 2,520 rows backfilled.

**Vacuum-only drive `…0023` (session 52)** catches a peak zero-seed regression. In the large drives every metric's true maximum is positive, so a running max seeded with 0 still reports correctly. In `…0023`, `boost_pressure_kpa` stays between −65.0 and −58.0 for all 180 samples (3 min of warm idle, device `…0005`). After `device_sync_complete`, `peak_metrics.boost_pressure_kpa` must be **−58**, not 0. Confirmed in session 52.
- The teardown deletes drives by `sync_session_id` as well as by id, so a re-seed removes whatever the function created.

**`has_anomaly`.** Inserting `diagnostic_outputs` fires `diagnostic_output_sets_has_anomaly`. The fixtures are chosen so that the seed flips **no** flag, and each drive's `has_anomaly` equals its INSERT literal:
- the only drive-scoped warning targets `…0030`, which is already true;
- `…0032` gets only an `info` output;
- the critical output is vehicle-scoped.

**Teardown.** The teardown deletes child before parent, and it also catches rows that tests create. It deletes agent queue rows by vehicle, drives by `sync_session_id`, and vehicles by fixture `device_id` (for example a `create_vehicle` happy-path run on `…0003`). Without the last of these, the `ON DELETE RESTRICT` FK would block the devices delete on the next re-seed.

**Local only.** This seed must never be `db push`ed or applied to dev or prod. The local CLI is linked to caeorta-dev, so always pass `--local` to `db reset`.

*What this section said until 2026-09-30, kept because the plan below still reads against it:* "We need a `supabase/seed.sql` file so dev can be reset to a known-good state with `supabase db reset --linked`. Until then, the dev project carries the three ad-hoc fixtures inserted during PR #8 verification (UUIDs `11111111-…` / `22222222-…` / `33333333-…`), which can drift." The file has existed since 2026-06-14 (`d2471b6`); the sentence was never updated. Whether dev still carries those three ad-hoc fixtures cannot be checked from this repo.

**What goes in `supabase/seed.sql` v1**:

- 3 test users (auth.users + public.users rows) with stable UUIDs and obviously-fake emails (`rls-test-1@caeorta.local` etc.).
- 3 test vehicles, one per user, each paired with a device.
- 1 unclaimed device (to test pairing flow).
- A handful of fake telemetry rows per vehicle (enough to exercise the per-vehicle index path).
- **No diagnostic outputs.** The AI Agent Contract v0 isn't finalized; seeding diagnostics now would lock in a shape we'd churn later. *(Superseded 2026-10-07: the contract table and its `has_anomaly` trigger are on `main`, and `diagnostic_feedback` needs outputs to reference. Three fixture outputs are now seeded — see Current contents above.)*

Make the seed file safe to re-run. **As of PR #37 (`9d453ca`, merged 2026-07-05) it genuinely is:** the file opens with a single **child → parent DELETE teardown block** (the reverse of the INSERT order) that removes the fixture rows before re-inserting them. This ordering is required because `vehicles.device_id REFERENCES devices(id) ON DELETE RESTRICT` (in `20260602130000_initial_schema.sql`) is the only `ON DELETE RESTRICT` FK among the seeded tables — a second apply would otherwise fail with `update or delete on table "devices" violates RESTRICT setting`. The re-runnability was verified empirically idempotent over 3 applies (row counts stable, telemetry 361). `ON CONFLICT DO NOTHING` alone was **not** sufficient (it does not resolve the RESTRICT FK on re-delete), which is why the earlier "ON CONFLICT everywhere" plan in this doc was superseded by the teardown-order fix.

**When to build it**: Week 2, after the first Edge Functions land. The seed file should exercise the device-JWT and pairing paths end-to-end (otherwise it's just a static dump that doesn't catch policy regressions in those flows).

**Open question — deferred to Week 2**: do we keep the existing 3 ad-hoc fixtures in dev when `seed.sql` arrives, or wipe and reseed? The seed file's re-run teardown (the PR-#37 child → parent DELETE block, above) makes both options safe — it deletes only its own fixture rows by fixed UUID, leaving unrelated ad-hoc rows untouched; the decision is whether we want a clean slate or continuity with the PR-#8 fixtures already used in mobile-auth testing. Document the choice in the workdiary entry that introduces `seed.sql`.
