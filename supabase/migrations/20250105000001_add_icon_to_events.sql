-- Migration: Add icon column to events table
-- This allows events to have dynamically selected icons from lucide-react

-- Add icon column to events table
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add comment to column
COMMENT ON COLUMN public.events.icon IS 'Name of the lucide-react icon to display for this event (e.g., "Church", "UtensilsCrossed", "Heart")';

