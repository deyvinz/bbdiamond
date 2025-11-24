-- Migration: Add enable_things_to_do column to weddings table
-- This allows wedding owners to show/hide the Things to do link in navigation

ALTER TABLE public.weddings
    ADD COLUMN IF NOT EXISTS enable_things_to_do BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.weddings.enable_things_to_do IS 'Whether to show the Things to do link in the navigation menu';

