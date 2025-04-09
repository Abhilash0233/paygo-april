-- Users and Wallet Migration for Supabase
-- This script creates a table for storing user profiles with integrated wallet functionality
-- It combines both users and wallet functionality in one table for simpler data management

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_crypto extension is not available in this Supabase instance
-- CREATE EXTENSION IF NOT EXISTS "pg_crypto";

-- Create users table with integrated wallet
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL, -- Short format ID (e.g., PG-1234-ABCD)
  phone_number TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  photo_url TEXT,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  profile_complete BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  is_first_time_user BOOLEAN DEFAULT TRUE,
  login_count INTEGER DEFAULT 1,
  username TEXT,
  device_info TEXT,
  
  -- Wallet fields
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  wallet_created_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create wallet_transactions table to track wallet history
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'booking', 'refund')),
  description TEXT NOT NULL,
  reference TEXT, -- For booking or refund references
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for wallet transactions
CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_type_idx ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx ON wallet_transactions(created_at);

-- Create a function to update the last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the last_updated field
-- First drop the trigger if it exists, then recreate it
DROP TRIGGER IF EXISTS update_users_last_updated ON users;
CREATE TRIGGER update_users_last_updated
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();

-- Create a function to update the wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user wallet balance when a transaction is inserted
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'deposit' OR NEW.type = 'refund' THEN
      -- Add to wallet for deposits and refunds
      UPDATE users SET wallet_balance = wallet_balance + NEW.amount WHERE user_id = NEW.user_id;
    ELSIF NEW.type = 'booking' THEN
      -- Subtract from wallet for bookings (amount should be negative for booking transactions)
      UPDATE users SET wallet_balance = wallet_balance + NEW.amount WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the wallet balance on transaction
-- First drop the trigger if it exists, then recreate it
DROP TRIGGER IF EXISTS update_wallet_on_transaction ON wallet_transactions;
CREATE TRIGGER update_wallet_on_transaction
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

-- Row Level Security (RLS)
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

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

-- RLS for wallet transactions
CREATE POLICY "Users can view their own transactions" ON wallet_transactions
FOR SELECT USING (user_id = (SELECT user_id FROM users WHERE phone_number = (SELECT phone FROM auth.users WHERE id = auth.uid())));

-- Allow users to insert their own transactions
CREATE POLICY "Users can insert their own transactions" ON wallet_transactions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create authenticated user security policies
CREATE POLICY "Service role can manage users" ON users
FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage transactions" ON wallet_transactions
FOR ALL TO service_role USING (true);

-- Add function to generate short user ID without pg_crypto
CREATE OR REPLACE FUNCTION generate_short_user_id(phone TEXT)
RETURNS TEXT AS $$
DECLARE
  last_digits TEXT;
  random_chars TEXT;
BEGIN
  -- Extract last 4 digits of phone number
  last_digits := SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g') FROM '([0-9]{1,4})$');
  
  -- If no digits found, use random digits
  IF last_digits IS NULL OR last_digits = '' THEN
    last_digits := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  
  -- Generate 4 random uppercase alphanumeric characters using MD5 instead of pg_crypto
  random_chars := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  
  -- Combine to form short ID
  RETURN 'PG-' || last_digits || '-' || random_chars;
END;
$$ LANGUAGE plpgsql;

-- Migration helper view to assist with Firebase to Supabase migration
CREATE OR REPLACE VIEW firebase_users_migration AS
SELECT
  id,
  user_id,
  phone_number,
  display_name,
  wallet_balance,
  is_first_time_user,
  created_at
FROM users;

-- Add comments to tables for documentation
COMMENT ON TABLE users IS 'User profiles with integrated wallet functionality';
COMMENT ON TABLE wallet_transactions IS 'Wallet transactions for tracking financial activities';
COMMENT ON COLUMN users.user_id IS 'Short format user ID (e.g., PG-1234-ABCD)';
COMMENT ON COLUMN users.wallet_balance IS 'Integrated wallet balance in the user profile'; 