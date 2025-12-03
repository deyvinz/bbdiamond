-- Migration: Make email column optional in guests table
-- Date: 2025-12-03
-- Description: Makes the email column nullable to allow guests without email addresses

-- Check if email column exists and has NOT NULL constraint, then make it nullable
DO $$
BEGIN
  -- Check if email column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'guests' 
      AND column_name = 'email'
      AND is_nullable = 'NO'
  ) THEN
    -- Remove NOT NULL constraint by altering column to allow NULL
    ALTER TABLE guests
    ALTER COLUMN email DROP NOT NULL;
    
    RAISE NOTICE 'Email column constraint removed - email is now optional';
  ELSE
    RAISE NOTICE 'Email column is already nullable or does not exist';
  END IF;
END $$;

-- Add comment to document the change
COMMENT ON COLUMN guests.email IS 'Email address (optional). Guests can be created without an email address.';

