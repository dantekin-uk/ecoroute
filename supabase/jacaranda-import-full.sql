-- =============================================================================
-- JACARANDA ESTATE FULL IMPORT (SAFE - NO DATA LOSS!)
-- =============================================================================

-- =============================================================================
-- PART 1: RUN THIS FIRST TO CREATE TEMP TABLE (NO DATA UPLOADED YET!)
-- =============================================================================

DROP TABLE IF EXISTS public.temp_jacaranda_ledger;

CREATE TABLE public.temp_jacaranda_ledger (
  hse_no TEXT,
  jan TEXT,
  feb TEXT,
  mar TEXT,
  apr TEXT,
  may TEXT,
  jun TEXT,
  jul TEXT,
  aug TEXT,
  sep TEXT,
  oct TEXT,
  nov TEXT,
  dec TEXT
);

-- =============================================================================
-- NOW DO THIS MANUALLY:
-- 1. Go to Supabase > Table Editor > temp_jacaranda_data table
-- 2. Click "Insert" > "Import data from CSV"
-- 3. Upload YOUR ORIGINAL FULL CSV (with Jan-Jun columns!)
-- 4. Once uploaded, come back and run PART 2 below!
-- =============================================================================

-- =============================================================================
-- PART 2: RUN THIS AFTER UPLOADING YOUR CSV TO temp_jacaranda_data
-- =============================================================================

-- First, make sure door_number exists on tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS door_number TEXT;
CREATE INDEX IF NOT EXISTS tenants_account_number_idx ON public.tenants (block_number, door_number, user_id);

-- =============================================================================
-- IMPORTANT: BEFORE RUNNING THIS PART, REPLACE 'YOUR_EMAIL@EXAMPLE.COM' BELOW
-- WITH YOUR ACTUAL LOGIN EMAIL!
-- =============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_estate_id UUID;
  v_current_balance NUMERIC;
  v_tenant_id UUID;
  v_block TEXT;
  v_door TEXT;
  v_monthly_rate NUMERIC;
  v_amount NUMERIC;
  v_hse_record RECORD;
  v_house_id TEXT;
BEGIN
  -- Step 1: Get your user_id using your email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'YOUR_EMAIL@EXAMPLE.COM'; -- REPLACE THIS!
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Could not find user with that email!';
  END IF;

  -- Step 2: Create Jacaranda Estate (or get id if already exists)
  INSERT INTO public.estates (name, user_id)
  SELECT 'Jacaranda', v_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.estates WHERE name = 'Jacaranda' AND user_id = v_user_id
  )
  RETURNING id INTO v_estate_id;

  IF v_estate_id IS NULL THEN
    SELECT id INTO v_estate_id FROM public.estates WHERE name = 'Jacaranda' AND user_id = v_user_id;
  END IF;

  -- Step 3: Process each house from temp_jacaranda_data
  FOR v_hse_record IN SELECT * FROM public.temp_jacaranda_data WHERE hse_no IS NOT NULL AND hse_no != '' LOOP
    -- Split house number into block and door
    IF v_hse_record.hse_no ~ '^[0-9]+[A-Za-z]$' THEN
      -- E.g., "4A" → block='4', door='A'
      v_block := substring(v_hse_record.hse_no from '^[0-9]+');
      v_door := substring(v_hse_record.hse_no from '[A-Za-z]$');
    ELSE
      -- E.g., "1", "2", etc.
      v_block := v_hse_record.hse_no;
      v_door := NULL;
    END IF;

    -- Build house_id (for transactions)
    v_house_id := CASE WHEN v_door IS NOT NULL THEN v_block || '-' || v_door ELSE v_block END;

    -- Determine monthly rate (default 400, or 300 if they paid 300 in any month)
    v_monthly_rate := 400;
    IF (v_hse_record.mar = '300' OR v_hse_record.apr = '300') THEN
      v_monthly_rate := 300; -- Adjust to 300 for houses that pay 300
    END IF;

    -- Insert tenant (or skip if already exists)
    INSERT INTO public.tenants (
      user_id, estate_id, block_number, door_number, tenant_name, phone_number, monthly_rate, current_balance, is_active
    )
    SELECT 
      v_user_id, 
      v_estate_id, 
      v_block, 
      v_door, 
      CASE WHEN v_hse_record.apr = 'Vacant' THEN 'Vacant' ELSE 'Occupant' END, 
      'N/A', 
      v_monthly_rate, 
      0, 
      CASE WHEN v_hse_record.apr = 'Vacant' THEN false ELSE true END
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenants 
      WHERE user_id = v_user_id 
      AND estate_id = v_estate_id 
      AND block_number = v_block 
      AND COALESCE(door_number, '') = COALESCE(v_door, '')
    )
    RETURNING id INTO v_tenant_id;

    -- Get tenant id if already existed
    IF v_tenant_id IS NULL THEN
      SELECT id INTO v_tenant_id FROM public.tenants 
      WHERE user_id = v_user_id 
      AND estate_id = v_estate_id 
      AND block_number = v_block 
      AND COALESCE(door_number, '') = COALESCE(v_door, '');
    END IF;

    -- Step 4: Calculate balance and import transactions (Jan-Jun)
    v_current_balance := 0;

    -- ------------------------------
    -- JANUARY
    -- ------------------------------
    IF v_hse_record.jan IS NOT NULL AND v_hse_record.jan != '' AND v_hse_record.jan != 'Vacant' THEN
      v_amount := CASE WHEN v_hse_record.jan ~ '^[0-9]+$' THEN v_hse_record.jan::NUMERIC ELSE 0 END;
      v_current_balance := v_current_balance - v_monthly_rate + v_amount;
      
      INSERT INTO public.transactions (user_id, house_number, estate_name, amount, payment_method, resulting_balance, created_at)
      VALUES (v_user_id, v_house_id, 'Jacaranda', v_amount, 
              CASE WHEN v_amount > 0 THEN 'Backlog: January' ELSE 'Monthly Rent (Jan)' END,
              v_current_balance, '2026-01-31 23:59:59+00')
      ON CONFLICT DO NOTHING;
    END IF;

    -- ------------------------------
    -- FEBRUARY
    -- ------------------------------
    IF v_hse_record.feb IS NOT NULL AND v_hse_record.feb != '' AND v_hse_record.feb != 'Vacant' THEN
      v_amount := CASE WHEN v_hse_record.feb ~ '^[0-9]+$' THEN v_hse_record.feb::NUMERIC ELSE 0 END;
      v_current_balance := v_current_balance - v_monthly_rate + v_amount;
      
      INSERT INTO public.transactions (user_id, house_number, estate_name, amount, payment_method, resulting_balance, created_at)
      VALUES (v_user_id, v_house_id, 'Jacaranda', v_amount, 
              CASE WHEN v_amount > 0 THEN 'Backlog: February' ELSE 'Monthly Rent (Feb)' END,
              v_current_balance, '2026-02-28 23:59:59+00')
      ON CONFLICT DO NOTHING;
    END IF;

    -- ------------------------------
    -- MARCH
    -- ------------------------------
    IF v_hse_record.mar IS NOT NULL AND v_hse_record.mar != '' AND v_hse_record.mar != 'Vacant' THEN
      v_amount := CASE WHEN v_hse_record.mar ~ '^[0-9]+$' THEN v_hse_record.mar::NUMERIC ELSE 0 END;
      v_current_balance := v_current_balance - v_monthly_rate + v_amount;
      
      INSERT INTO public.transactions (user_id, house_number, estate_name, amount, payment_method, resulting_balance, created_at)
      VALUES (v_user_id, v_house_id, 'Jacaranda', v_amount, 
              CASE WHEN v_amount > 0 THEN 'Backlog: March' ELSE 'Monthly Rent (Mar)' END,
              v_current_balance, '2026-03-31 23:59:59+00')
      ON CONFLICT DO NOTHING;
    END IF;

    -- ------------------------------
    -- APRIL
    -- ------------------------------
    IF v_hse_record.apr IS NOT NULL AND v_hse_record.apr != '' AND v_hse_record.apr != 'Vacant' THEN
      v_amount := CASE WHEN v_hse_record.apr ~ '^[0-9]+$' THEN v_hse_record.apr::NUMERIC ELSE 0 END;
      v_current_balance := v_current_balance - v_monthly_rate + v_amount;
      
      INSERT INTO public.transactions (user_id, house_number, estate_name, amount, payment_method, resulting_balance, created_at)
      VALUES (v_user_id, v_house_id, 'Jacaranda', v_amount, 
              CASE WHEN v_amount > 0 THEN 'Backlog: April' ELSE 'Monthly Rent (Apr)' END,
              v_current_balance, '2026-04-30 23:59:59+00')
      ON CONFLICT DO NOTHING;
    END IF;

    -- ------------------------------
    -- MAY
    -- ------------------------------
    IF v_hse_record.may IS NOT NULL AND v_hse_record.may != '' AND v_hse_record.may != 'Vacant' THEN
      v_amount := CASE WHEN v_hse_record.may ~ '^[0-9]+$' THEN v_hse_record.may::NUMERIC ELSE 0 END;
      v_current_balance := v_current_balance - v_monthly_rate + v_amount;
      
      INSERT INTO public.transactions (user_id, house_number, estate_name, amount, payment_method, resulting_balance, created_at)
      VALUES (v_user_id, v_house_id, 'Jacaranda', v_amount, 
              CASE WHEN v_amount > 0 THEN 'Backlog: May' ELSE 'Monthly Rent (May)' END,
              v_current_balance, '2026-05-31 23:59:59+00')
      ON CONFLICT DO NOTHING;
    END IF;

    -- ------------------------------
    -- JUNE
    -- ------------------------------
    IF v_hse_record.jun IS NOT NULL AND v_hse_record.jun != '' AND v_hse_record.jun != 'Vacant' THEN
      v_amount := CASE WHEN v_hse_record.jun ~ '^[0-9]+$' THEN v_hse_record.jun::NUMERIC ELSE 0 END;
      v_current_balance := v_current_balance - v_monthly_rate + v_amount;
      
      INSERT INTO public.transactions (user_id, house_number, estate_name, amount, payment_method, resulting_balance, created_at)
      VALUES (v_user_id, v_house_id, 'Jacaranda', v_amount, 
              CASE WHEN v_amount > 0 THEN 'Backlog: June' ELSE 'Monthly Rent (Jun)' END,
              v_current_balance, '2026-06-30 23:59:59+00')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Step 5: Update tenant's final current_balance!
    UPDATE public.tenants
    SET current_balance = v_current_balance
    WHERE id = v_tenant_id;

  END LOOP;

  RAISE NOTICE '✅ Jacaranda Estate import complete! Check your app!';
END $$;

-- =============================================================================
-- DONE! 🎉
-- =============================================================================
