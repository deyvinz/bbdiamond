-- Migration: Add enable_seating column to weddings table
-- This allows wedding owners to show/hide the Seating link in navigation

ALTER TABLE public.weddings
    ADD COLUMN IF NOT EXISTS enable_seating BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.weddings.enable_seating IS 'Whether to show the Seating link in the navigation menu';

