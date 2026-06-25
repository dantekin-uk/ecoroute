-- =============================================================================
-- Jacaranda Estate Import Helper
-- =============================================================================

-- First: CREATE JACARANDA ESTATE (if not already created)
-- (Uncomment and run this if you haven't created Jacaranda via the app already
-- INSERT INTO public.estates (name, user_id) 
--   SELECT 'Jacaranda', auth.uid() 
--   WHERE NOT EXISTS (SELECT 1 FROM public.estates WHERE name = 'Jacaranda' AND user_id = auth.uid());

-- =============================================================================
-- To use this, you need:
-- 1. Your user_id (from auth.users table)
-- 2. Jacaranda Estate's estate_id (from estates table after creating it)
-- =============================================================================

-- Example of how to get your user_id and estate_id (run these in SQL Editor):
-- SELECT id AS your_user_id FROM auth.users WHERE email = 'your-email@example.com';
-- SELECT id AS jacaranda_estate_id FROM public.estates WHERE name = 'Jacaranda' AND user_id = 'YOUR_USER_ID';

-- =============================================================================
-- Step 1: Import Tenants
-- =============================================================================
-- You can import via app (Bulk Import) or via SQL:

-- Example SQL for inserting a single tenant (run for each house):
-- INSERT INTO public.tenants (user_id, estate_id, block_number, door_number, tenant_name, phone_number, monthly_rate, current_balance, is_active)
-- VALUES (
--   'YOUR_USER_ID',
--   'JACARANDA_ESTATE_ID',
--   '1',           -- Plot/Block Number (HSE_NO from your CSV)
--   NULL,         -- Unit/Door Number (only for HSE_NO like '4A', door_number would be 'A', '4' is block_number
--   'Occupant',
--   'N/A',
--   400,
--   -2400,   -- 6 months * 400 = 2400, adjust based on payments
--   true
-- );

-- =============================================================================
-- Step 2: Import Transactions
-- =============================================================================
-- Example SQL for inserting a transaction:
-- INSERT INTO public.transactions (
--   user_id, house_number, estate_name, amount, payment_method, resulting_balance, created_at
-- )
-- VALUES (
--   'YOUR_USER_ID',
--   '1',               -- House number (from tenants table, block_number + door_number (e.g. '4 for house 4A it's '4', door is 'A'
--   'Jacaranda',
--   400,
--   'Backlog: January',
--   -2000, -- example resulting_balance after this transaction
--   '2026-01-31 23:59:59+00' -- set created_at for January
-- )
