-- =============================================================================
-- EcoRoute — DATA ISOLATION & USER ASSOCIATION (Run once in Supabase SQL Editor)
-- =============================================================================
-- This script adds user_id column to all tables and updates RLS policies to filter
-- data by the currently authenticated user.
-- =============================================================================

-- =============================================================================
-- 1. Add user_id column to all tables
-- =============================================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.estates ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.collectors ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.consumables ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.fixed_assets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.dispense_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_id UUID;

-- =============================================================================
-- 2. Create indexes on user_id for better performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS tenants_user_id_idx ON public.tenants (user_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS estates_user_id_idx ON public.estates (user_id);
CREATE INDEX IF NOT EXISTS collectors_user_id_idx ON public.collectors (user_id);
CREATE INDEX IF NOT EXISTS consumables_user_id_idx ON public.consumables (user_id);
CREATE INDEX IF NOT EXISTS fixed_assets_user_id_idx ON public.fixed_assets (user_id);
CREATE INDEX IF NOT EXISTS dispense_logs_user_id_idx ON public.dispense_logs (user_id);
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses (user_id);

-- =============================================================================
-- 3. Update Row Level Security (RLS) policies for all tables
-- =============================================================================

-- ------------------------------
-- Tenants Table
-- ------------------------------
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
DROP POLICY IF EXISTS "tenants_delete" ON public.tenants;

CREATE POLICY "tenants_select" ON public.tenants 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tenants_insert" ON public.tenants 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tenants_update" ON public.tenants 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tenants_delete" ON public.tenants 
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------
-- Transactions Table
-- ------------------------------
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;

CREATE POLICY "transactions_select" ON public.transactions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions 
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------
-- Estates Table
-- ------------------------------
DROP POLICY IF EXISTS "estates_select" ON public.estates;
DROP POLICY IF EXISTS "estates_insert" ON public.estates;
DROP POLICY IF EXISTS "estates_update" ON public.estates;
DROP POLICY IF EXISTS "estates_delete" ON public.estates;

CREATE POLICY "estates_select" ON public.estates 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "estates_insert" ON public.estates 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "estates_update" ON public.estates 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "estates_delete" ON public.estates 
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------
-- Collectors Table
-- ------------------------------
DROP POLICY IF EXISTS "collectors_select" ON public.collectors;
DROP POLICY IF EXISTS "collectors_insert" ON public.collectors;
DROP POLICY IF EXISTS "collectors_update" ON public.collectors;
DROP POLICY IF EXISTS "collectors_delete" ON public.collectors;

CREATE POLICY "collectors_select" ON public.collectors 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "collectors_insert" ON public.collectors 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "collectors_update" ON public.collectors 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "collectors_delete" ON public.collectors 
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------
-- Consumables Table
-- ------------------------------
DROP POLICY IF EXISTS "consumables_select" ON public.consumables;
DROP POLICY IF EXISTS "consumables_insert" ON public.consumables;
DROP POLICY IF EXISTS "consumables_update" ON public.consumables;
DROP POLICY IF EXISTS "consumables_delete" ON public.consumables;

CREATE POLICY "consumables_select" ON public.consumables 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "consumables_insert" ON public.consumables 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consumables_update" ON public.consumables 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consumables_delete" ON public.consumables 
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------
-- Fixed Assets Table
-- ------------------------------
DROP POLICY IF EXISTS "fixed_assets_select" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_insert" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_update" ON public.fixed_assets;
DROP POLICY IF EXISTS "fixed_assets_delete" ON public.fixed_assets;

CREATE POLICY "fixed_assets_select" ON public.fixed_assets 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fixed_assets_insert" ON public.fixed_assets 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_assets_update" ON public.fixed_assets 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_assets_delete" ON public.fixed_assets 
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------
-- Dispense Logs Table
-- ------------------------------
DROP POLICY IF EXISTS "dispense_logs_select" ON public.dispense_logs;
DROP POLICY IF EXISTS "dispense_logs_insert" ON public.dispense_logs;
DROP POLICY IF EXISTS "dispense_logs_update" ON public.dispense_logs;
DROP POLICY IF EXISTS "dispense_logs_delete" ON public.dispense_logs;

CREATE POLICY "dispense_logs_select" ON public.dispense_logs 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dispense_logs_insert" ON public.dispense_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dispense_logs_update" ON public.dispense_logs 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dispense_logs_delete" ON public.dispense_logs 
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------
-- Expenses Table
-- ------------------------------
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert" ON public.expenses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON public.expenses 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON public.expenses 
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 4. Enable RLS for any tables that might not have it enabled
-- =============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collectors ENABLE ROW LEVEL SECURITY;
