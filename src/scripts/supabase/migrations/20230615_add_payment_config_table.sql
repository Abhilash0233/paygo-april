-- Migration: Add payment_config table for storing payment gateway settings
-- Description: Creates a table to store payment gateway configuration, replacing Firebase storage

-- Create payment_config table
CREATE TABLE IF NOT EXISTS payment_config (
  id TEXT PRIMARY KEY,
  is_live_mode BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL
);

-- Add RLS (Row Level Security) policies
ALTER TABLE payment_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view payment configuration
CREATE POLICY "Only admins can view payment configuration" 
  ON payment_config 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Policy: Only admins can update payment configuration
CREATE POLICY "Only admins can update payment configuration" 
  ON payment_config 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Policy: Only admins can insert payment configuration
CREATE POLICY "Only admins can insert payment configuration" 
  ON payment_config 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
    )
  );

-- Add comment to table
COMMENT ON TABLE payment_config IS 'Stores payment gateway configuration for the application';

-- Add comments to columns
COMMENT ON COLUMN payment_config.id IS 'Unique identifier for configuration (e.g., "environment")';
COMMENT ON COLUMN payment_config.is_live_mode IS 'Flag indicating whether to use live (true) or test (false) mode';
COMMENT ON COLUMN payment_config.last_updated IS 'Timestamp when the configuration was last updated';
COMMENT ON COLUMN payment_config.updated_by IS 'ID of the user who last updated the configuration';

-- Insert default configuration (test mode)
INSERT INTO payment_config (id, is_live_mode, last_updated, updated_by)
VALUES ('environment', false, NOW(), 'system')
ON CONFLICT (id) DO NOTHING; 