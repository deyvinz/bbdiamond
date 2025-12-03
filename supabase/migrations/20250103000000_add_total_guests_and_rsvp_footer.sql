-- Migration: Add total_guests to guests table and rsvp_footer to wedding_config
-- Date: 2025-01-03
-- Description: Adds total_guests column to guests table for dynamic plus-ones per guest,
--              and adds rsvp_footer config key support for RSVP form footer messages

-- 1. Add total_guests column to guests table
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS total_guests INTEGER DEFAULT 1;

-- Add comment describing the column
COMMENT ON COLUMN guests.total_guests IS 'Total number of guests allowed for this household head. Max plus-ones = total_guests - 1. Defaults to 1 if not set.';

-- 2. Update existing guests to have default total_guests of 1 if NULL
UPDATE guests
SET total_guests = 1
WHERE total_guests IS NULL;

-- 3. Add constraint to ensure total_guests is between 1 and 20
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guests_total_guests_check'
  ) THEN
    ALTER TABLE guests
    ADD CONSTRAINT guests_total_guests_check
    CHECK (total_guests >= 1 AND total_guests <= 20);
  END IF;
END $$;

-- Note: rsvp_footer will be stored as a key-value pair in wedding_config table
-- No migration needed for wedding_config as it already supports arbitrary key-value pairs
-- The rsvp_footer will be inserted/updated via the config service when admin saves it

