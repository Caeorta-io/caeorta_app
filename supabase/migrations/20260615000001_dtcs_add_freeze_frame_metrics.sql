-- Migration: add freeze_frame_metrics to dtcs table
-- Resolves R23: DTC detail screen (S6) requires sensor snapshot at DTC fire time.
-- freeze_frame_metrics stores the OBD metric values captured at the moment the DTC
-- was first seen, populated by device_sync_chunk during ingestion.

ALTER TABLE public.dtcs
  ADD COLUMN IF NOT EXISTS freeze_frame_metrics jsonb;

COMMENT ON COLUMN public.dtcs.freeze_frame_metrics IS
  'OBD sensor snapshot at DTC first-seen time. Populated by device_sync_chunk. Used for S6 DTC detail freeze-frame Metric Tiles.';
