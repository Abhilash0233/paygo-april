-- Consolidated Fixes for Supabase Migration
-- This script combines critical changes from all migration scripts
-- and uses IF EXISTS/OR REPLACE syntax to avoid errors

-- ========= FIX SECURITY DEFINER ISSUE =========

-- Drop and recreate the migration view without SECURITY DEFINER
DROP VIEW IF EXISTS firebase_users_migration;

CREATE VIEW firebase_users_migration AS
SELECT
  id,
  user_id,
  phone_number,
  display_name,
  wallet_balance,
  is_first_time_user,
  created_at
FROM users;

-- ========= WALLET TRANSACTIONS POLICIES =========

-- Drop policies if they exist
DROP POLICY IF EXISTS "Allow wallet transactions for test users" ON wallet_transactions;
DROP POLICY IF EXISTS allow_test_user_wallet_transactions ON wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow test transactions to be created" ON wallet_transactions;

-- Recreate policies for wallet transactions
CREATE POLICY "Users can view their own transactions" ON wallet_transactions
FOR SELECT USING (
  user_id = (SELECT user_id FROM users WHERE phone_number = (SELECT phone FROM auth.users WHERE id = auth.uid()))
  OR substring(user_id, 1, 4) = 'DEV-'
);

-- Allow users to insert their own transactions
CREATE POLICY "Users can insert their own transactions" ON wallet_transactions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL OR 
  substring(user_id, 1, 4) = 'DEV-'
);

-- Create policy for test transactions
CREATE POLICY "Allow test transactions to be created" ON wallet_transactions
FOR INSERT 
WITH CHECK (
  user_id LIKE 'DEV-%' OR
  auth.uid() IS NOT NULL
);

-- Enable wallet transactions for test users
CREATE POLICY "Allow wallet transactions for test users" ON wallet_transactions
FOR ALL
USING (
  user_id LIKE 'DEV-%' OR 
  auth.uid() = (SELECT id FROM users WHERE user_id = user_id LIMIT 1)
);

-- ========= USER POLICIES =========

-- Drop policies if they exist
DROP POLICY IF EXISTS "Allow test users to be created" ON users;
DROP POLICY IF EXISTS "Allow updating last_login for any user" ON users;
DROP POLICY IF EXISTS "Allow anonymous operations for test users" ON users;

-- Create policy to allow test users to be created
CREATE POLICY "Allow test users to be created" ON users
FOR INSERT 
WITH CHECK (
  user_id LIKE 'DEV-%' OR 
  phone_number LIKE '+%' OR
  auth.uid() IS NOT NULL
);

-- Create policy allowing updates to last_login
CREATE POLICY "Allow updating last_login for any user" ON users
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create policy for anonymous test user operations
CREATE POLICY "Allow anonymous operations for test users" ON users
FOR ALL
USING (
  user_id LIKE 'DEV-%' OR
  id::text LIKE '11111111-2222-3333-4444-%'
);

-- Update service role policies
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage transactions" ON wallet_transactions;
CREATE POLICY "Service role can manage transactions" ON wallet_transactions
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ========= FIX INCREMENT LOGIN COUNT FUNCTION =========

-- Update the increment_login_count function
CREATE OR REPLACE FUNCTION increment_login_count(user_id_param TEXT)
RETURNS INT AS $$
DECLARE
  current_count INT;
BEGIN
  -- Handle test users
  IF substring(user_id_param, 1, 4) = 'DEV-' THEN
    RETURN 1; -- Return 1 for test users without affecting database
  END IF;

  -- Get current login count or default to 0 if not found
  SELECT COALESCE(login_count, 0) INTO current_count 
  FROM users 
  WHERE user_id = user_id_param;
  
  -- If no matching user found, set count to 0
  IF current_count IS NULL THEN
    current_count := 0;
  END IF;
  
  -- Update login count in database
  UPDATE users 
  SET login_count = current_count + 1
  WHERE user_id = user_id_param;
  
  -- Return incremented count
  RETURN current_count + 1;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 1 as fallback
    RAISE NOTICE 'Error in increment_login_count: %', SQLERRM;
    RETURN 1;
END;
$$ LANGUAGE plpgsql;

-- Add a comment about test users
COMMENT ON TABLE users IS 'User profiles with integrated wallet functionality. DEV- prefixed user_ids are for testing.'; 