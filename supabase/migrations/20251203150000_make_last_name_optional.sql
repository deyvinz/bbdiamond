-- Migration: Make last_name column optional in guests table
-- Date: 2025-12-03
-- Description: Makes the last_name column nullable to allow guests without last names

-- Check if last_name column exists and has NOT NULL constraint, then make it nullable
DO $$
BEGIN
  -- Check if last_name column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'guests' 
      AND column_name = 'last_name'
      AND is_nullable = 'NO'
  ) THEN
    -- Remove NOT NULL constraint by altering column to allow NULL
    ALTER TABLE guests
    ALTER COLUMN last_name DROP NOT NULL;
    
    RAISE NOTICE 'Last name column constraint removed - last_name is now optional';
  ELSE
    RAISE NOTICE 'Last name column is already nullable or does not exist';
  END IF;
END $$;

-- Add comment to document the change
COMMENT ON COLUMN guests.last_name IS 'Last name (optional). Guests can be created without a last name.';

