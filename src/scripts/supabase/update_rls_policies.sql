-- Row Level Security (RLS) Policies for User Profiles and Wallet Transactions
-- This script updates the Row Level Security policies to fix permission issues

-- ======== Users Table Policies ========

-- Drop existing policies first to avoid "already exists" errors
DROP POLICY IF EXISTS "Anyone can check if a phone number exists" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert their profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;

-- Allow anonymous users to check if a phone number exists
CREATE POLICY "Anyone can check if a phone number exists" ON users
FOR SELECT USING (true);

-- Allow authenticated users to insert records during signup/profile creation
CREATE POLICY "Allow authenticated users to insert their profile" ON users
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING (
  auth.uid()::text = user_id OR 
  phone_number = (SELECT phone FROM auth.users WHERE id = auth.uid())
);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
FOR UPDATE USING (
  auth.uid()::text = user_id OR 
  phone_number = (SELECT phone FROM auth.users WHERE id = auth.uid())
);

-- Create authenticated user security policies
CREATE POLICY "Service role can manage users" ON users
FOR ALL TO service_role USING (true);

-- ======== Wallet Transactions Table Policies ========

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON wallet_transactions;

-- RLS for wallet transactions
CREATE POLICY "Users can view their own transactions" ON wallet_transactions
FOR SELECT USING (user_id = (SELECT user_id FROM users WHERE phone_number = (SELECT phone FROM auth.users WHERE id = auth.uid())));

-- Allow users to insert their own transactions
CREATE POLICY "Users can insert their own transactions" ON wallet_transactions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create authenticated user security policies
CREATE POLICY "Service role can manage transactions" ON wallet_transactions
FOR ALL TO service_role USING (true); 