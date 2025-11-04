-- Migration: Add wedding_id columns to all tenant-scoped tables
-- This migration adds nullable wedding_id columns that will be backfilled and made NOT NULL later

-- Add wedding_id to guests table
ALTER TABLE public.guests
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to households table
ALTER TABLE public.households
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to invitations table
ALTER TABLE public.invitations
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to invitation_events table
ALTER TABLE public.invitation_events
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to events table
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to seating_tables table
ALTER TABLE public.seating_tables
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to seats table
ALTER TABLE public.seats
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to rsvps_v2 table
ALTER TABLE public.rsvps_v2
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Add wedding_id to announcements table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        ALTER TABLE public.announcements
            ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add wedding_id to mail_logs table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mail_logs') THEN
        ALTER TABLE public.mail_logs
            ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add wedding_id to profiles table (users can be associated with multiple weddings)
-- This allows users to have different roles per wedding
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Create indexes for wedding_id columns
CREATE INDEX IF NOT EXISTS idx_guests_wedding_id ON public.guests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_households_wedding_id ON public.households(wedding_id);
CREATE INDEX IF NOT EXISTS idx_invitations_wedding_id ON public.invitations(wedding_id);
CREATE INDEX IF NOT EXISTS idx_invitation_events_wedding_id ON public.invitation_events(wedding_id);
CREATE INDEX IF NOT EXISTS idx_events_wedding_id ON public.events(wedding_id);
CREATE INDEX IF NOT EXISTS idx_seating_tables_wedding_id ON public.seating_tables(wedding_id);
CREATE INDEX IF NOT EXISTS idx_seats_wedding_id ON public.seats(wedding_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_v2_wedding_id ON public.rsvps_v2(wedding_id);
CREATE INDEX IF NOT EXISTS idx_profiles_wedding_id ON public.profiles(wedding_id);

-- Create indexes for announcements and mail_logs if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        CREATE INDEX IF NOT EXISTS idx_announcements_wedding_id ON public.announcements(wedding_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mail_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_mail_logs_wedding_id ON public.mail_logs(wedding_id);
    END IF;
END $$;

