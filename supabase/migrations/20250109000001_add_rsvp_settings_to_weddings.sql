-- Migration: Add RSVP form configuration fields to weddings
-- Adds toggles for dietary inputs and banner visibility settings

ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS show_dietary_restrictions BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS show_additional_dietary_info BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.weddings
  ADD COLUMN IF NOT EXISTS rsvp_banner_days_before INTEGER NOT NULL DEFAULT 30 CHECK (rsvp_banner_days_before >= 1);

