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
| ecu_type | text | 'oem' \| 'haltech' \| 'aem' \| 'motec' \| 'link' \| 'other' |
| modifications | jsonb | Free-form for now; itemize in v2 |
| created_at | timestamptz | |

> ⚠️ **Platform-track note:** a `create_vehicle` Edge Function is planned for v1. Once it lands, update this section to document the new write-path alongside `vehicles_no_direct_insert`. The App-track add-vehicle screen (Week 3) is built against this function's contract; the function itself is Sulaiman's to build.

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
| timestamp | timestamptz | When the sample was taken on the car (not when uploaded) |
| metrics | jsonb | { rpm: 2450, coolant_temp_c: 87, ... } |

Indexed on `(vehicle_id, timestamp DESC)`.

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
| distance_km | numeric | |
| duration_seconds | int | |
| average_speed_kph | numeric | |
| peak_metrics | jsonb | { max_rpm: 6800, max_boost_bar: 1.4, ... } |
| summary_metrics | jsonb | { avg_coolant_temp_c: 88, avg_afr: 14.6, ... } |
| sync_session_id | uuid | FK |
| has_anomaly | bool | Flag set by agent for quick filtering |

Indexed on `(vehicle_id, started_at DESC)`.

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

Add indexes only when query patterns demand them. Initial set:

- `telemetry (vehicle_id, timestamp DESC)`
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
- Apply to dev with `supabase db push --linked`
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

**Migration promotion status** (updated 2026-06-21):

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

## Test fixtures

We need a `supabase/seed.sql` file so dev can be reset to a known-good state with `supabase db reset --linked`. Until then, the dev project carries the three ad-hoc fixtures inserted during PR #8 verification (UUIDs `11111111-…` / `22222222-…` / `33333333-…`), which can drift.

**What goes in `supabase/seed.sql` v1**:

- 3 test users (auth.users + public.users rows) with stable UUIDs and obviously-fake emails (`rls-test-1@caeorta.local` etc.).
- 3 test vehicles, one per user, each paired with a device.
- 1 unclaimed device (to test pairing flow).
- A handful of fake telemetry rows per vehicle (enough to exercise the per-vehicle index path).
- **No diagnostic outputs.** The AI Agent Contract v0 isn't finalized; seeding diagnostics now would lock in a shape we'd churn later.

Use `INSERT … ON CONFLICT DO NOTHING` everywhere so the seed file is safe to re-run and works whether or not the existing PR-#8 fixtures are still present.

**When to build it**: Week 2, after the first Edge Functions land. The seed file should exercise the device-JWT and pairing paths end-to-end (otherwise it's just a static dump that doesn't catch policy regressions in those flows).

**Open question — deferred to Week 2**: do we keep the existing 3 ad-hoc fixtures in dev when `seed.sql` arrives, or wipe and reseed? The seed file's `ON CONFLICT DO NOTHING` clauses make both options safe; the decision is whether we want a clean slate or continuity with the PR-#8 fixtures already used in mobile-auth testing. Document the choice in the workdiary entry that introduces `seed.sql`.
