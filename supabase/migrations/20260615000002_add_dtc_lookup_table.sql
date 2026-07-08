-- Migration: OBD-II DTC lookup table
-- Read-only reference table seeded with common P0xxx codes (SAE J2012 standard).
-- Used by app/admin to show human-readable descriptions alongside raw DTC codes.

CREATE TABLE IF NOT EXISTS public.dtc_lookup (
  code         text PRIMARY KEY,
  description  text NOT NULL,
  system       text NOT NULL CHECK (system IN
               ('fuel_air_metering','ignition','emissions','vehicle_speed','computer_output',
                'transmission','turbo_boost','other')),
  severity_hint text CHECK (severity_hint IN ('info','warning','critical')),
  common_causes text
);
COMMENT ON TABLE public.dtc_lookup IS
  'Read-only reference: standard SAE J2012 P0xxx codes. Not RLS-protected (public reference data).';

ALTER TABLE public.dtc_lookup ENABLE ROW LEVEL SECURITY;

CREATE POLICY dtc_lookup_select_all ON public.dtc_lookup
  FOR SELECT USING (true);
