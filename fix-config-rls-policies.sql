-- Fix RLS policies for app_config table to allow service role upsert operations
-- Run this script in your Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role can insert app configs" ON public.app_config;
DROP POLICY IF EXISTS "Service role can update app configs" ON public.app_config;
DROP POLICY IF EXISTS "Service role can delete app configs" ON public.app_config;
DROP POLICY IF EXISTS "Admin and staff can read app configs" ON public.app_config;

-- Ensure RLS is enabled
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API operations)
CREATE POLICY "Service role can insert app configs" 
  ON public.app_config
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update app configs" 
  ON public.app_config
  FOR UPDATE 
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can delete app configs" 
  ON public.app_config
  FOR DELETE 
  TO authenticated
  USING (auth.role() = 'service_role');

-- Allow admin and staff to read configs
CREATE POLICY "Admin and staff can read app configs" 
  ON public.app_config
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify policies are created
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'app_config'
ORDER BY policyname;

-- Test: Show current app_config rows
SELECT key, value, description, created_at, updated_at
FROM app_config
ORDER BY key;

-- Note: If the table is empty, you can insert default values:
-- INSERT INTO app_config (key, value, description) VALUES
--   ('plus_ones_enabled', 'false', 'Enable or disable plus-one functionality across the site'),
--   ('max_party_size', '1', 'Maximum number of people allowed per invitation (including the main guest)'),
--   ('allow_guest_plus_ones', 'false', 'Allow guests to specify plus-ones when RSVPing'),
--   ('rsvp_enabled', 'true', 'Enable or disable RSVP functionality for all guests'),
--   ('rsvp_cutoff_timezone', 'America/New_York', 'Timezone for the RSVP cutoff date (IANA timezone identifier)')
-- ON CONFLICT (key) DO NOTHING;

