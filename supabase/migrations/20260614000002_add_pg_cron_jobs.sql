-- Migration: pg_cron jobs for telemetry retention and downsampling
-- Runs nightly to keep the telemetry table lean.

-- Job 1: Downsample telemetry older than 30 days into per-minute aggregates
-- Runs at 2am UTC every day
SELECT cron.schedule(
  'downsample-old-telemetry',
  '0 2 * * *',
  $$
  INSERT INTO telemetry (vehicle_id, sync_session_id, timestamp, metrics)
  SELECT
    vehicle_id,
    sync_session_id,
    date_trunc('minute', timestamp) AS timestamp,
    jsonb_object_agg(key, avg_val) AS metrics
  FROM (
    SELECT
      vehicle_id,
      sync_session_id,
      timestamp,
      key,
      AVG(value::numeric) AS avg_val
    FROM telemetry,
      jsonb_each_text(metrics) AS kv(key, value)
    WHERE timestamp < now() - interval '30 days'
      AND timestamp >= now() - interval '31 days'
    GROUP BY vehicle_id, sync_session_id, date_trunc('minute', timestamp), key
  ) agg
  GROUP BY vehicle_id, sync_session_id, timestamp
  ON CONFLICT DO NOTHING;

  -- Delete the raw rows that were just aggregated
  DELETE FROM telemetry
  WHERE timestamp < now() - interval '30 days'
    AND timestamp >= now() - interval '31 days'
    AND id NOT IN (
      SELECT id FROM telemetry
      WHERE timestamp = date_trunc('minute', timestamp)
    );
  $$
);

-- Job 2: Delete device_events older than 90 days
SELECT cron.schedule(
  'cleanup-device-events',
  '0 3 * * *',
  $$
  DELETE FROM device_events
  WHERE timestamp < now() - interval '90 days';
  $$
);

-- Job 3: Delete old failed/pending sync sessions older than 7 days
SELECT cron.schedule(
  'cleanup-stale-sync-sessions',
  '0 4 * * *',
  $$
  DELETE FROM sync_sessions
  WHERE status IN ('failed', 'pending')
    AND started_at < now() - interval '7 days';
  $$
);
