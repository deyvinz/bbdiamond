-- Migration: Update RLS policies for unified authentication and add one customer per wedding constraint
-- This migration updates RLS policies to work with customer-based authentication
-- and enforces one customer per wedding constraint

-- First, ensure one customer per wedding constraint
-- Drop existing constraint if it exists
ALTER TABLE wedding_owners
DROP CONSTRAINT IF EXISTS one_customer_per_wedding;

-- Add unique constraint on wedding_id to ensure one customer per wedding
ALTER TABLE wedding_owners
ADD CONSTRAINT one_customer_per_wedding 
UNIQUE (wedding_id);

-- Update RLS policies for wedding_owners table
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view wedding owners for their weddings" ON wedding_owners;

-- Create new policy: Users can view wedding owners for weddings they own
CREATE POLICY "Users can view wedding owners for their weddings"
  ON wedding_owners FOR SELECT
  USING (
    auth.uid() = customer_id
    OR
    auth.uid() IN (
      SELECT customer_id FROM wedding_owners WHERE wedding_id = wedding_owners.wedding_id
    )
  );

-- Create policy: Users can insert wedding owners (only for their own weddings)
-- This should be restricted to service role or specific admin functions
-- For now, we'll allow users to insert if they're the customer being added
CREATE POLICY "Users can insert themselves as wedding owners"
  ON wedding_owners FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Update RLS policies for customers table
-- Ensure customers can only view/update their own data
DROP POLICY IF EXISTS "Users can view own customer data" ON customers;
DROP POLICY IF EXISTS "Users can update own customer data" ON customers;

CREATE POLICY "Users can view own customer data"
  ON customers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own customer data"
  ON customers FOR UPDATE
  USING (auth.uid() = id);

-- Update RLS policies for weddings table to use customer_id via wedding_owners
-- Drop old policies that use owner_id
DROP POLICY IF EXISTS "Allow public read access to active weddings" ON weddings;
DROP POLICY IF EXISTS "Allow wedding owners to manage their weddings" ON weddings;

-- Create new policies using wedding_owners relationship
CREATE POLICY "Allow public read access to active weddings"
  ON weddings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Allow wedding owners to manage their weddings"
  ON weddings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = weddings.id
      AND wedding_owners.customer_id = auth.uid()
    )
  );

-- Update wedding_themes RLS to use wedding_owners
DROP POLICY IF EXISTS "Allow wedding owners to manage their themes" ON wedding_themes;

CREATE POLICY "Allow wedding owners to manage their themes"
  ON wedding_themes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = wedding_themes.wedding_id
      AND wedding_owners.customer_id = auth.uid()
    )
  );

-- Update wedding_domains RLS to use wedding_owners
DROP POLICY IF EXISTS "Allow wedding owners to manage their domains" ON wedding_domains;

CREATE POLICY "Allow wedding owners to manage their domains"
  ON wedding_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = wedding_domains.wedding_id
      AND wedding_owners.customer_id = auth.uid()
    )
  );

-- Update wedding_config RLS to use wedding_owners
DROP POLICY IF EXISTS "Allow wedding owners to manage their config" ON wedding_config;

CREATE POLICY "Allow wedding owners to manage their config"
  ON wedding_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = wedding_config.wedding_id
      AND wedding_owners.customer_id = auth.uid()
    )
  );

-- Update wedding_email_config RLS to use wedding_owners
DROP POLICY IF EXISTS "Allow wedding owners to manage their email config" ON wedding_email_config;

CREATE POLICY "Allow wedding owners to manage their email config"
  ON wedding_email_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = wedding_email_config.wedding_id
      AND wedding_owners.customer_id = auth.uid()
    )
  );

-- Update user_has_wedding_access function to use wedding_owners instead of owner_id
CREATE OR REPLACE FUNCTION public.user_has_wedding_access(wedding_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is the owner via wedding_owners table
    IF EXISTS (
        SELECT 1 FROM public.wedding_owners
        WHERE wedding_id = wedding_uuid
        AND customer_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

