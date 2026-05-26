-- =============================================================================
-- Remove ALL inventory rows (old mock / seed data)
-- Run once in Supabase SQL Editor, then add your own stock in the app.
-- =============================================================================

TRUNCATE TABLE public.dispense_logs, public.consumables, public.fixed_assets;

SELECT 'consumables' AS table_name, COUNT(*)::int AS rows_left FROM public.consumables
UNION ALL
SELECT 'fixed_assets', COUNT(*)::int FROM public.fixed_assets
UNION ALL
SELECT 'dispense_logs', COUNT(*)::int FROM public.dispense_logs;
