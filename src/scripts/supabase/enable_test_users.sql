-- Enable DEV- prefixed test users in Supabase
-- This script adds specific policies to handle test users for development and testing

-- Drop existing test user policies if they exist
DROP POLICY IF EXISTS "Allow test users to be created" ON users;
DROP POLICY IF EXISTS "Allow test transactions to be created" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow updating last_login for any user" ON users;
DROP POLICY IF EXISTS "Allow anonymous operations for test users" ON users;
DROP POLICY IF EXISTS "Allow wallet transactions for test users" ON wallet_transactions;
DROP POLICY IF EXISTS allow_test_user_wallet_transactions ON wallet_transactions;

-- Create policy to allow test users (DEV-* prefixed) to be created without authentication
CREATE POLICY "Allow test users to be created" ON users
FOR INSERT 
WITH CHECK (
  user_id LIKE 'DEV-%' OR 
  phone_number LIKE '+%' OR
  auth.uid() IS NOT NULL
);

-- Create a specific policy allowing updates to last_login for all users
-- This is important for tracking user activity without auth requirements
CREATE POLICY "Allow updating last_login for any user" ON users
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create policy to allow anonymous operations (read/update) for test users
CREATE POLICY "Allow anonymous operations for test users" ON users
FOR ALL
USING (
  user_id LIKE 'DEV-%' OR
  id::text LIKE '11111111-2222-3333-4444-%'
);

-- Create policy to allow test transactions to be created
CREATE POLICY "Allow test transactions to be created" ON wallet_transactions
FOR INSERT 
WITH CHECK (
  user_id LIKE 'DEV-%' OR
  auth.uid() IS NOT NULL
);

-- Update the service role policy to ensure it can do everything
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ensure the service role can manage all wallet transactions
DROP POLICY IF EXISTS "Service role can manage transactions" ON wallet_transactions;
CREATE POLICY "Service role can manage transactions" ON wallet_transactions
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add a comment explaining the purpose of these policies
COMMENT ON TABLE users IS 'User profiles with integrated wallet functionality. DEV- prefixed user_ids are for testing.';

-- Enable wallet transactions for test users
CREATE POLICY "Allow wallet transactions for test users" ON wallet_transactions
FOR ALL
USING (
  user_id LIKE 'DEV-%' OR 
  auth.uid() = (SELECT id FROM users WHERE user_id = user_id LIMIT 1)
);

-- Ensure increment_login_count properly handles test users
CREATE OR REPLACE FUNCTION increment_login_count(user_id_param TEXT)
RETURNS INT AS $$
DECLARE
  current_count INT;
BEGIN
  -- Handle test users (starting with 'DEV-')
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