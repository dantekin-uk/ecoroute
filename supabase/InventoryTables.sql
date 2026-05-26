-- =============================================================================
-- EcoRoute Inventory — SCHEMA ONLY (no sample / mock data)
-- =============================================================================
-- Run once in Supabase SQL Editor. Admins add stock from the Inventory page.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  critical_threshold INT NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Units',
  price_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Good',
  assigned_to TEXT,
  purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dispense_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector TEXT NOT NULL,
  estate_id UUID,
  estate_name TEXT,
  item TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consumables_name_idx ON public.consumables (name);
CREATE INDEX IF NOT EXISTS dispense_logs_timestamp_idx ON public.dispense_logs (timestamp DESC);

ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispense_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consumables_select" ON public.consumables;
DROP POLICY IF EXISTS "consumables_insert" ON public.consumables;
DROP POLICY IF EXISTS "consumables_update" ON public.consumables;
DROP POLICY IF EXISTS "consumables_delete" ON public.consumables;

CREATE POLICY "consumables_select" ON public.consumables FOR SELECT USING (true);
CREATE POLICY "consumables_insert" ON public.consumables FOR INSERT WITH CHECK (true);
CREATE POLICY "consumables_update" ON public.consumables FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "consumables_delete" ON public.consumables FOR DELETE USING (true);

DROP POLICY IF EXISTS "fixed_assets_select" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_insert" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_update" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_delete" ON public.fixed_assets;

CREATE POLICY "fixed_assets_select" ON public.fixed_assets FOR SELECT USING (true);
CREATE POLICY "fixed_assets_insert" ON public.fixed_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "fixed_assets_update" ON public.fixed_assets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "fixed_assets_delete" ON public.fixed_assets FOR DELETE USING (true);

DROP POLICY IF EXISTS "dispense_logs_select" ON public.dispense_logs;
DROP POLICY IF EXISTS "dispense_logs_insert" ON public.dispense_logs;
DROP POLICY IF EXISTS "dispense_logs_update" ON public.dispense_logs;
DROP POLICY IF EXISTS "dispense_logs_delete" ON public.dispense_logs;

CREATE POLICY "dispense_logs_select" ON public.dispense_logs FOR SELECT USING (true);
CREATE POLICY "dispense_logs_insert" ON public.dispense_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "dispense_logs_update" ON public.dispense_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "dispense_logs_delete" ON public.dispense_logs FOR DELETE USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'consumables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consumables;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fixed_assets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fixed_assets;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dispense_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispense_logs;
  END IF;
END $$;
