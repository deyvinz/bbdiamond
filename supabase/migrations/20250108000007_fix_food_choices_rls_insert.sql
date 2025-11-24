-- Migration: Fix wedding_food_choices RLS policy to support INSERT operations
-- The current policy only has USING clause which doesn't work for INSERT
-- We need to add WITH CHECK clause for INSERT operations
-- Also allow admins and staff to manage food choices

-- Drop all existing policies on wedding_food_choices
DROP POLICY IF EXISTS "Allow wedding owners to manage food choices" ON wedding_food_choices;
DROP POLICY IF EXISTS "Allow wedding owners and admins to manage food choices" ON wedding_food_choices;

-- Create a helper function to check if user has admin/staff access
-- This function uses SECURITY DEFINER to bypass RLS when checking profiles
CREATE OR REPLACE FUNCTION public.user_has_admin_access_to_wedding(wedding_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is admin/staff for this specific wedding
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.wedding_id = wedding_uuid
        AND profiles.role IN ('admin', 'staff')
    ) THEN
        RETURN true;
    END IF;
    
    -- Check if user is a global admin (no wedding_id restriction)
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.wedding_id IS NULL OR profiles.wedding_id = wedding_uuid)
        AND profiles.role = 'admin'
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy with both USING and WITH CHECK clauses
-- USING: for SELECT, UPDATE, DELETE
-- WITH CHECK: for INSERT, UPDATE
-- Allows: 
--   1. Wedding owners (via wedding_owners table - customers who own weddings)
--   2. Admins/staff (via profiles table - can be wedding-specific or global)
--   3. Service role (for system operations)
CREATE POLICY "Allow wedding owners and admins to manage food choices"
  ON wedding_food_choices FOR ALL
  USING (
    -- Allow service role (bypasses all checks)
    auth.role() = 'service_role'
    OR
    -- Check if user is a wedding owner (customer)
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = wedding_food_choices.wedding_id
      AND wedding_owners.customer_id = auth.uid()
    )
    OR
    -- Check if user is admin/staff for this wedding (using function to bypass RLS)
    public.user_has_admin_access_to_wedding(wedding_food_choices.wedding_id)
  )
  WITH CHECK (
    -- Allow service role (bypasses all checks)
    auth.role() = 'service_role'
    OR
    -- For INSERT/UPDATE: Check if user is a wedding owner
    -- Note: In WITH CHECK, we reference the column directly (it refers to the new/updated row)
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = wedding_food_choices.wedding_id
      AND wedding_owners.customer_id = auth.uid()
    )
    OR
    -- Check if user is admin/staff for this wedding (using function to bypass RLS)
    public.user_has_admin_access_to_wedding(wedding_food_choices.wedding_id)
  );

