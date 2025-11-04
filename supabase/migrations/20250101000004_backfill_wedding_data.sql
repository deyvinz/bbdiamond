-- Migration: Backfill existing data with default wedding and make wedding_id NOT NULL
-- This migration should be run after creating a default wedding instance

-- Note: This migration assumes a default wedding has been created via application code or seed script
-- The application should handle creating the default wedding for self-hosted deployments

-- Function to get or create default wedding
-- This is a helper that will be called during backfill
CREATE OR REPLACE FUNCTION public.get_default_wedding_id()
RETURNS UUID AS $$
DECLARE
    default_wedding_id UUID;
BEGIN
    -- Try to get an existing wedding (for self-hosted, there should be one)
    SELECT id INTO default_wedding_id
    FROM public.weddings
    WHERE slug = 'default' OR custom_domain IS NOT NULL
    LIMIT 1;
    
    -- If no wedding exists, we'll need to create one via application code
    -- This migration will fail if no wedding exists, which is intentional
    IF default_wedding_id IS NULL THEN
        RAISE EXCEPTION 'No default wedding found. Please create a wedding first.';
    END IF;
    
    RETURN default_wedding_id;
END;
$$ LANGUAGE plpgsql;

-- Backfill wedding_id for all existing records
-- This assumes all existing data belongs to the default wedding
DO $$
DECLARE
    default_wedding_id UUID;
BEGIN
    default_wedding_id := public.get_default_wedding_id();
    
    -- Update all tables with default wedding_id where NULL
    UPDATE public.guests SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    UPDATE public.households SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    UPDATE public.invitations SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    UPDATE public.invitation_events SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    UPDATE public.events SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    UPDATE public.seating_tables SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    UPDATE public.seats SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    UPDATE public.rsvps_v2 SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    
    -- Update announcements if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        UPDATE public.announcements SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    END IF;
    
    -- Update mail_logs if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mail_logs') THEN
        UPDATE public.mail_logs SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
    END IF;
    
    -- For profiles, we don't backfill as users can be associated with multiple weddings
    -- But we should handle it differently based on existing structure
    
    RAISE NOTICE 'Backfilled all records with wedding_id: %', default_wedding_id;
END $$;

-- After backfilling, make wedding_id NOT NULL (except for profiles which can be multi-wedding)
ALTER TABLE public.guests
    ALTER COLUMN wedding_id SET NOT NULL;

ALTER TABLE public.households
    ALTER COLUMN wedding_id SET NOT NULL;

ALTER TABLE public.invitations
    ALTER COLUMN wedding_id SET NOT NULL;

ALTER TABLE public.invitation_events
    ALTER COLUMN wedding_id SET NOT NULL;

ALTER TABLE public.events
    ALTER COLUMN wedding_id SET NOT NULL;

ALTER TABLE public.seating_tables
    ALTER COLUMN wedding_id SET NOT NULL;

ALTER TABLE public.seats
    ALTER COLUMN wedding_id SET NOT NULL;

ALTER TABLE public.rsvps_v2
    ALTER COLUMN wedding_id SET NOT NULL;

-- For announcements and mail_logs, make NOT NULL if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        ALTER TABLE public.announcements ALTER COLUMN wedding_id SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mail_logs') THEN
        ALTER TABLE public.mail_logs ALTER COLUMN wedding_id SET NOT NULL;
    END IF;
END $$;

-- Note: profiles.wedding_id remains nullable to support multi-wedding users
-- For profiles, we may need a separate wedding_user_roles junction table if users need multiple roles

