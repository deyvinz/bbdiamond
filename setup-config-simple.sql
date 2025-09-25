-- Simple setup script for app_config table
-- This works with your existing RLS policies

-- Create app_config table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);

-- Insert default configuration values
-- Note: This will only work if you're running as service_role or have admin/staff role
INSERT INTO app_config (key, value, description) VALUES
  ('plus_ones_enabled', 'false', 'Enable or disable plus-one functionality across the site'),
  ('max_party_size', '1', 'Maximum number of people allowed per invitation (including the main guest)'),
  ('allow_guest_plus_ones', 'false', 'Allow guests to specify plus-ones when RSVPing')
ON CONFLICT (key) DO NOTHING;

-- Verify the setup
SELECT 'Setup complete! Configuration table created with default values.' as status;
SELECT key, value, description FROM app_config ORDER BY key;
