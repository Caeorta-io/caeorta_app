-- Migration: fix downsample-old-telemetry cron job
-- The original job (20260614000002) has never successfully run — verified via
-- cron.job_run_details, error: "column telemetry.timestamp must appear in the
-- GROUP BY clause or be used in an aggregate function". The inner subquery
-- selected bare `timestamp` while grouping by `date_trunc('minute', timestamp)`.
-- A second latent bug: ON CONFLICT DO NOTHING with no unique constraint on
-- telemetry (would have errored too once the GROUP BY was fixed). And the
-- DELETE identified "rows to keep" by re-checking whether their own timestamp
-- happened to already be minute-aligned, which could wrongly delete the
-- freshly-inserted downsampled rows in the same pass.
--
-- This migration unschedules the broken job and reschedules a corrected one
-- that: groups correctly, does a plain INSERT (no conflict target needed —
-- this is an aggregate of DISTINCT already-grouped rows, so duplicates within
-- one run are structurally impossible), and deletes the source raw rows by
-- their own primary key captured before the insert, not by re-deriving shape.

SELECT cron.unschedule('downsample-old-telemetry');

SELECT cron.schedule(
  'downsample-old-telemetry',
  '0 2 * * *',
  $$
  WITH raw_window AS (
    SELECT id, vehicle_id, sync_session_id, timestamp, metrics
    FROM telemetry
    WHERE timestamp < now() - interval '30 days'
      AND timestamp >= now() - interval '31 days'
  ),
  aggregated AS (
    SELECT
      vehicle_id,
      sync_session_id,
      date_trunc('minute', timestamp) AS minute_ts,
      key,
      AVG(value::numeric) AS avg_val
    FROM raw_window,
      jsonb_each_text(metrics) AS kv(key, value)
    GROUP BY vehicle_id, sync_session_id, date_trunc('minute', timestamp), key
  ),
  rolled_up AS (
    SELECT
      vehicle_id,
      sync_session_id,
      minute_ts AS timestamp,
      jsonb_object_agg(key, avg_val) AS metrics
    FROM aggregated
    GROUP BY vehicle_id, sync_session_id, minute_ts
  ),
  inserted AS (
    INSERT INTO telemetry (vehicle_id, sync_session_id, timestamp, metrics)
    SELECT vehicle_id, sync_session_id, timestamp, metrics FROM rolled_up
    RETURNING 1
  )
  DELETE FROM telemetry
  WHERE id IN (SELECT id FROM raw_window);
  $$
);
