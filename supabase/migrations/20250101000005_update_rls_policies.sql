-- Migration: Update all RLS policies for tenant isolation using wedding_id
-- This migration updates existing RLS policies to filter by wedding_id

-- Drop old policies and create new tenant-isolated ones
-- Note: This assumes existing policies exist. Adjust based on actual policy names.

-- Helper function to check if user has access to a wedding
CREATE OR REPLACE FUNCTION public.user_has_wedding_access(wedding_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is the owner
    IF EXISTS (
        SELECT 1 FROM public.weddings
        WHERE id = wedding_uuid
        AND owner_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;
    
    -- Check if user is staff/admin for this wedding
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.wedding_id = wedding_uuid
        AND profiles.role IN ('admin', 'staff')
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies (adjust names based on actual policy names)
DROP POLICY IF EXISTS "Users can view their own data" ON public.guests;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.guests;
DROP POLICY IF EXISTS "Users can update their own data" ON public.guests;
DROP POLICY IF EXISTS "Admins can view all guests" ON public.guests;
DROP POLICY IF EXISTS "Admins can manage all guests" ON public.guests;

-- Guests table policies
CREATE POLICY "Public can view guests for active weddings" ON public.guests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = guests.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Users with wedding access can manage guests" ON public.guests
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- Households table policies
DROP POLICY IF EXISTS "Users can view households" ON public.households;
DROP POLICY IF EXISTS "Admins can manage households" ON public.households;

CREATE POLICY "Public can view households for active weddings" ON public.households
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = households.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Users with wedding access can manage households" ON public.households
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- Invitations table policies
DROP POLICY IF EXISTS "Users can view their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;

CREATE POLICY "Users can view invitations by token" ON public.invitations
    FOR SELECT USING (
        -- Allow viewing by token (for RSVP flow)
        true
    );

CREATE POLICY "Users with wedding access can manage invitations" ON public.invitations
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- Invitation events table policies
DROP POLICY IF EXISTS "Users can view invitation events" ON public.invitation_events;
DROP POLICY IF EXISTS "Admins can manage invitation events" ON public.invitation_events;

CREATE POLICY "Users can view invitation events by invitation token" ON public.invitation_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invitations
            WHERE invitations.id = invitation_events.invitation_id
        )
    );

CREATE POLICY "Users with wedding access can manage invitation events" ON public.invitation_events
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- Events table policies
DROP POLICY IF EXISTS "Public can view events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Public can view events for active weddings" ON public.events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = events.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Users with wedding access can manage events" ON public.events
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- Seating tables policies
DROP POLICY IF EXISTS "Users can view seating tables" ON public.seating_tables;
DROP POLICY IF EXISTS "Admins can manage seating tables" ON public.seating_tables;

CREATE POLICY "Public can view seating tables for active weddings" ON public.seating_tables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = seating_tables.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Users with wedding access can manage seating tables" ON public.seating_tables
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- Seats policies
DROP POLICY IF EXISTS "Users can view seats" ON public.seats;
DROP POLICY IF EXISTS "Admins can manage seats" ON public.seats;

CREATE POLICY "Public can view seats for active weddings" ON public.seats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = seats.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Users with wedding access can manage seats" ON public.seats
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- RSVPs policies
DROP POLICY IF EXISTS "Users can view rsvps" ON public.rsvps_v2;
DROP POLICY IF EXISTS "Users can create rsvps" ON public.rsvps_v2;
DROP POLICY IF EXISTS "Admins can manage rsvps" ON public.rsvps_v2;

CREATE POLICY "Users can view their own RSVPs" ON public.rsvps_v2
    FOR SELECT USING (
        -- Allow viewing by invitation token (handled in application logic)
        true
    );

CREATE POLICY "Users can create RSVPs via invitation" ON public.rsvps_v2
    FOR INSERT WITH CHECK (
        -- Allow creating RSVPs (invitation token validation in application)
        true
    );

CREATE POLICY "Users with wedding access can manage RSVPs" ON public.rsvps_v2
    FOR ALL USING (public.user_has_wedding_access(wedding_id));

-- Announcements policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
        DROP POLICY IF EXISTS "Public can view announcements" ON public.announcements;
        DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
        
        CREATE POLICY "Public can view announcements for active weddings" ON public.announcements
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.weddings
                    WHERE weddings.id = announcements.wedding_id
                    AND weddings.status = 'active'
                )
            );
        
        CREATE POLICY "Users with wedding access can manage announcements" ON public.announcements
            FOR ALL USING (public.user_has_wedding_access(wedding_id));
    END IF;
END $$;

-- Mail logs policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mail_logs') THEN
        DROP POLICY IF EXISTS "Admins can view mail logs" ON public.mail_logs;
        
        CREATE POLICY "Users with wedding access can view mail logs" ON public.mail_logs
            FOR SELECT USING (public.user_has_wedding_access(wedding_id));
    END IF;
END $$;

-- Profiles policies (multi-wedding support)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profiles" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profiles" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users with wedding access can view profiles for their wedding" ON public.profiles
    FOR SELECT USING (
        wedding_id IS NOT NULL AND public.user_has_wedding_access(wedding_id)
    );

-- Update existing app_config policies to work with wedding_config
-- Note: app_config may be kept for backward compatibility or migrated to wedding_config
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_config') THEN
        -- Keep app_config accessible only to admins (for backward compatibility)
        -- New config should use wedding_config
        DROP POLICY IF EXISTS "Service role can insert app configs" ON public.app_config;
        DROP POLICY IF EXISTS "Service role can update app configs" ON public.app_config;
        DROP POLICY IF EXISTS "Service role can delete app configs" ON public.app_config;
        DROP POLICY IF EXISTS "Admin and staff can read app configs" ON public.app_config;
        
        -- Only service role can access app_config (deprecated, use wedding_config)
        CREATE POLICY "Service role can manage app configs" ON public.app_config
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

