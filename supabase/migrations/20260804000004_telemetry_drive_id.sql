-- Migration: telemetry.drive_id + FK + (drive_id, timestamp) index
--
-- THIS FILE WAS WRITTEN ON 2026-09-30, NOT 2026-08-04. READ THIS FIRST.
-- ----------------------------------------------------------------------------
-- It fills a gap at its TRUE HISTORICAL NUMBER. It is not a new change to the
-- schema; it is the recovery of a migration that was applied but never
-- committed.
--
-- The dev database's supabase_migrations.schema_migrations contains version
-- 20260804000004, name "telemetry_drive_id", applied 2026-08-06 and recorded
-- as built in the session-17 workdiary. The file never reached the repo -- no
-- branch has ever contained it -- so the sequence on main read
-- ...0001, 0002, 0003, 0005 and the number looked like an unused gap. It was
-- not. (20260812000002's header and the AI Agent Contract §12 both described
-- it as unused; the contract is corrected in the PR that adds this file, the
-- migration header is not, because applied migrations are immutable.)
--
-- Two things followed from the missing file:
--   1. The Supabase CLI refuses `db push` against a database whose migration
--      history contains a version with no local file, so nothing later could
--      reach dev until the record and the repo agreed again.
--   2. Dev carried an index, telemetry_drive_id_timestamp, that no migration
--      on main created.
--
-- WHY RECREATE RATHER THAN `supabase migration repair --status reverted`
-- ----------------------------------------------------------------------------
-- Repair would record the version as reverted. It was not reverted: its
-- objects are still live in dev. A history that says "reverted" over live
-- objects is worse than an orphan record. Recreating the file makes the
-- existing record true instead of replacing it with a false one.
--
-- WRITTEN FROM DEV'S CAPTURED DDL, NOT RECONSTRUCTED
-- ----------------------------------------------------------------------------
-- The original SQL is lost. Every object below is written from the dev-drift
-- audit captures taken 2026-09-29 (_schema_audit/dev_*.csv), which record what
-- this version actually left in dev:
--
--   dev_columns.csv      telemetry,drive_id,uuid,YES
--   dev_constraints.csv  telemetry_drive_id_fkey:
--                          FOREIGN KEY (drive_id) REFERENCES drives(id)
--                          ON DELETE SET NULL
--   dev_indexes.csv      CREATE INDEX telemetry_drive_id_timestamp
--                          ON public.telemetry USING btree (drive_id, "timestamp")
--
-- It is not derived from 20260812000001 or from memory of the lost file.
--
-- EVERY STATEMENT IS GUARDED
-- ----------------------------------------------------------------------------
-- On dev this version is already in the history, so the CLI never runs this
-- file there; and if it were run, every statement finds its object present and
-- does nothing. On any database built from the migration set -- CI,
-- `supabase db reset`, a fresh project -- it creates the objects, and
-- 20260812000001 then finds the column and the FK already present and skips
-- them through its own guards.
--
-- RELATIONSHIP TO 20260812000001_add_telemetry_drive_id.sql
-- ----------------------------------------------------------------------------
-- That migration was written before anyone knew this one had existed. It
-- guards the same column and the same named FK, and it creates two indexes:
--
--   telemetry_drive_id_idx                   (drive_id) WHERE drive_id IS NOT NULL
--   telemetry_sync_session_id_timestamp_idx  (sync_session_id, "timestamp")
--
-- Those are DIFFERENT indexes from telemetry_drive_id_timestamp below, and the
-- three intentionally coexist. It also sets the COMMENT ON COLUMN for
-- drive_id; this file deliberately sets none, so the two do not fight over it.
--
-- DECISION: ADOPT telemetry_drive_id_timestamp, DO NOT DROP IT
-- ----------------------------------------------------------------------------
-- Taken by the founder 2026-09-30. (drive_id, "timestamp") is the better index
-- for the actual read path -- all telemetry for one drive, in time order.
-- Dropping a live index risks a plan regression on the largest table in the
-- schema for no gain; keeping a possibly-redundant one costs only write
-- overhead that dev is already paying. telemetry_drive_id_idx (partial) is
-- kept as well: the two are not redundant enough to choose between without
-- evidence. The basis for revisiting this is a pg_stat_user_indexes review --
-- if that shows either index unused under real load, drop it then, in a new
-- migration, on that evidence.

-- ----------------------------------------------------------------------------
-- 1. Column
-- ----------------------------------------------------------------------------
ALTER TABLE public.telemetry ADD COLUMN IF NOT EXISTS drive_id uuid;

-- ----------------------------------------------------------------------------
-- 2. Foreign key
-- ----------------------------------------------------------------------------
-- Named and conditional, NOT bundled into the ADD COLUMN above: ADD COLUMN
-- IF NOT EXISTS skips the entire clause, inline REFERENCES included, when the
-- column already exists. 20260812000001 carries the identical guard, which is
-- what keeps two migrations touching one constraint from creating it twice.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'telemetry_drive_id_fkey'
      AND conrelid = 'public.telemetry'::regclass
  ) THEN
    ALTER TABLE public.telemetry
      ADD CONSTRAINT telemetry_drive_id_fkey
      FOREIGN KEY (drive_id) REFERENCES public.drives(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Index
-- ----------------------------------------------------------------------------
-- Dev's indexdef verbatim, plus the IF NOT EXISTS guard.
CREATE INDEX IF NOT EXISTS telemetry_drive_id_timestamp
  ON public.telemetry USING btree (drive_id, "timestamp");
