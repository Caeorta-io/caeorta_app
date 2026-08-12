-- Migration: add telemetry.drive_id + supporting indexes
-- Per docs/AI_Agent_Contract/proposed-app-changes.md §2 and ai-agent-contract.md §12.
--
-- WHY THIS MIGRATION EXISTS: THE DDL SHIPPED AFTER THE CODE THAT USES IT
-- ----------------------------------------------------------------------------
-- c1dafc4 ("feat(agent): backfill telemetry.drive_id during drive segmentation")
-- added this write to supabase/functions/device_sync_complete/index.ts:
--
--     await adminClient.from('telemetry')
--       .update({ drive_id: insertedDrive.id })
--       .in('id', telemetryIds);
--
-- but no migration ever added the column. Until this file, telemetry was
-- (id, vehicle_id, sync_session_id, timestamp, metrics) in the migration set --
-- see 20260602130000_initial_schema.sql.
--
-- The failure was invisible because the write's error is caught and treated as
-- non-fatal ("the drive and its metrics are already correctly inserted"), so a
-- missing column produced a log line and nothing else. Any environment built
-- from migrations alone -- CI, `supabase db reset`, a fresh dev project --
-- silently never populated drive_id, and get_drive_telemetry quietly stayed on
-- its older sync_session_id + timestamp-range path.
--
-- ANALOGOUS LIVE BUG, NOT FIXED HERE: device_sync_complete writes
-- vehicles.last_sync_at with the same unchecked pattern, and that column does
-- not exist on vehicles either (findings-from-repo-review.md P1-1). Named here
-- so it is findable; it needs its own migration and its own decision about the
-- swallowed error.

-- ----------------------------------------------------------------------------
-- 1. Column
-- ----------------------------------------------------------------------------
-- IF NOT EXISTS is deliberate, not defensive boilerplate: the column already
-- exists in at least one live environment, added outside the migration set
-- (c1dafc4's end-to-end test observed drive_id being written successfully).
-- This must be a no-op there rather than an error.
--
-- CAVEAT, and the reason the PR asks Platform how the column was created: if
-- the out-of-band column exists WITHOUT this FK, ADD COLUMN IF NOT EXISTS skips
-- the whole clause and the constraint is NOT added -- the environments then
-- differ in referential integrity while both "have the column". Verify with
-- \d public.telemetry after applying, and if the FK is absent in dev, it needs
-- a follow-up ALTER TABLE ... ADD CONSTRAINT rather than a re-run of this file.
--
-- ON DELETE SET NULL, not CASCADE: deleting a drive must never delete telemetry
-- rows. The drive is an aggregate over the samples, not their owner.
ALTER TABLE public.telemetry
  ADD COLUMN IF NOT EXISTS drive_id uuid
  REFERENCES public.drives(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.telemetry.drive_id IS
  'Set by device_sync_complete during drive segmentation. NULL for rows predating the association, or where segmentation did not assign one. Consumers must tolerate NULL.';

-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------
-- The column and its index ship together on purpose. telemetry is the heaviest
-- table in the schema and carried exactly one index before this migration
-- (telemetry_vehicle_id_timestamp_idx on (vehicle_id, timestamp DESC)), which
-- serves neither access path below. A drive_id with no index relocates the scan
-- rather than removing it.

-- Partial: every pre-association row is NULL, and no query looks for those --
-- they are found via sync_session_id + timestamp range instead (see below).
-- Keeping them out of the index keeps it proportional to associated rows only.
CREATE INDEX IF NOT EXISTS telemetry_drive_id_idx
  ON public.telemetry (drive_id) WHERE drive_id IS NOT NULL;

-- Serves get_drive_telemetry's documented association query:
--   .eq('sync_session_id', drive.sync_session_id)
--   .gte('timestamp', drive.started_at).lte('timestamp', drive.ended_at)
-- which has been scanning since it was written -- telemetry had no index on
-- sync_session_id at all. NOT redundant against drive_id: see §3.
CREATE INDEX IF NOT EXISTS telemetry_sync_session_id_timestamp_idx
  ON public.telemetry (sync_session_id, timestamp);

-- ----------------------------------------------------------------------------
-- 3. On backfilling existing rows -- deliberately NOT done here
-- ----------------------------------------------------------------------------
-- There is no backfill UPDATE in this migration, and adding one later would be
-- a mistake without new information.
--
-- Drive boundaries are not recoverable from the database. device_sync_complete
-- computes them in memory, segmenting a sync session's telemetry on a 5-minute
-- gap (DRIVE_GAP_MS), and before c1dafc4 it discarded that grouping entirely.
-- What persists is drives.started_at / ended_at -- derived from the same pass,
-- but a migration re-deriving the association from a timestamp range join would
-- be reconstructing a guess, not restoring a fact. Samples at idle, during
-- ignition-off, or between back-to-back drives inside one session fall in no
-- drive or arguably two; that ambiguity is exactly what the column exists to
-- remove, so writing it back in with a range join defeats the point.
--
-- Pre-association rows therefore keep drive_id IS NULL permanently, and
-- get_drive_telemetry's sync_session_id + timestamp filter remains the correct
-- path for them. That is why the index in §2 is not redundant: it is not a
-- legacy fallback awaiting removal, it is the only path historical rows have.
-- Raw telemetry is purged at 30 days (docs/05 retention), so the NULL cohort is
-- self-limiting and drains without intervention.
