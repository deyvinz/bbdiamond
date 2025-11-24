-- Migration: Add picture_url column to events table
-- This allows events to have venue pictures displayed on the homepage

-- Add picture_url column to events table
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Add comment to column
COMMENT ON COLUMN public.events.picture_url IS 'URL to the event venue picture stored in Supabase Storage';

