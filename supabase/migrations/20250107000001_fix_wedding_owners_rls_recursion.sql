-- Migration: Fix infinite recursion in wedding_owners RLS policy
-- The previous policy had a circular reference that caused infinite recursion
-- This migration fixes the policy to only check if the user is the customer_id

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view wedding owners for their weddings" ON wedding_owners;

-- Create fixed policy: Users can only view rows where they are the customer_id
-- This is sufficient since each wedding has only one owner (enforced by unique constraint)
CREATE POLICY "Users can view wedding owners for their weddings"
  ON wedding_owners FOR SELECT
  USING (auth.uid() = customer_id);

-- Also update wedding_food_choices policy to use wedding_owners instead of owner_id
-- This ensures consistency with the new authentication model
DROP POLICY IF EXISTS "Allow wedding owners to manage food choices" ON wedding_food_choices;

CREATE POLICY "Allow wedding owners to manage food choices"
  ON wedding_food_choices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wedding_owners
      WHERE wedding_owners.wedding_id = wedding_food_choices.wedding_id
      AND wedding_owners.customer_id = auth.uid()
    )
  );

