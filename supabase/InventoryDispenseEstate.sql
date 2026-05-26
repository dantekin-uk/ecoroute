-- Add estate tracking to dispense logs (run once in Supabase SQL Editor)

ALTER TABLE public.dispense_logs
  ADD COLUMN IF NOT EXISTS estate_id UUID,
  ADD COLUMN IF NOT EXISTS estate_name TEXT;

CREATE INDEX IF NOT EXISTS dispense_logs_estate_idx ON public.dispense_logs (estate_name);
