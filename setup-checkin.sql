-- Check-in system setup
-- This file sets up the database functions for guest check-ins using existing attendance_v2 table

-- Note: The attendance_v2 table already exists with the following structure:
-- CREATE TABLE public.attendance_v2 (
--   id uuid not null default gen_random_uuid (),
--   invitation_event_id uuid not null,
--   checked_in_at timestamp with time zone not null default now(),
--   checked_in_by uuid null,
--   constraint attendance_v2_pkey primary key (id),
--   constraint attendance_v2_invitation_event_id_key unique (invitation_event_id),
--   constraint attendance_v2_checked_in_by_fkey foreign KEY (checked_in_by) references profiles (id),
--   constraint attendance_v2_invitation_event_id_fkey foreign KEY (invitation_event_id) references invitation_events (id) on delete CASCADE
-- );

-- Enable RLS on attendance_v2 if not already enabled
ALTER TABLE attendance_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_v2 table (if not already exist)
-- Admins and staff can read all attendance records
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_v2' 
    AND policyname = 'Admins and staff can read attendance'
  ) THEN
    CREATE POLICY "Admins and staff can read attendance" ON attendance_v2
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- Admins and staff can insert attendance records
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'attendance_v2' 
    AND policyname = 'Admins and staff can insert attendance'
  ) THEN
    CREATE POLICY "Admins and staff can insert attendance" ON attendance_v2
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('admin', 'staff')
        )
      );
  END IF;
END $$;

-- Optimized function combining efficiency with comprehensive validation
CREATE OR REPLACE FUNCTION check_in_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_event RECORD;
  v_attendance_id UUID;
BEGIN
  -- Find invitation_event by token with all necessary data
  SELECT 
    ie.id as invitation_event_id,
    ie.status,
    g.first_name,
    g.last_name,
    g.email,
    g.invite_code,
    e.name as event_name,
    e.venue as event_venue
  INTO v_invitation_event
  FROM invitations i
  JOIN guests g ON i.guest_id = g.id
  JOIN invitation_events ie ON i.id = ie.invitation_id
  JOIN events e ON ie.event_id = e.id
  WHERE i.token = p_token
  AND ie.status = 'accepted' -- Only allow check-in for accepted invitations
  LIMIT 1;

  -- Check if invitation exists and is accepted
  IF v_invitation_event IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid invitation token or invitation not accepted'
    );
  END IF;

  -- Perform check-in with conflict resolution (efficient approach)
  INSERT INTO attendance_v2 (invitation_event_id, checked_in_by)
  VALUES (v_invitation_event.invitation_event_id, auth.uid())
  ON CONFLICT (invitation_event_id) 
  DO UPDATE SET 
    checked_in_at = NOW(),
    checked_in_by = auth.uid()
  RETURNING id INTO v_attendance_id;

  -- Return success response with guest/event details
  RETURN json_build_object(
    'success', true,
    'message', 'Successfully checked in',
    'guest_name', v_invitation_event.first_name || ' ' || v_invitation_event.last_name,
    'guest_email', v_invitation_event.email,
    'invite_code', v_invitation_event.invite_code,
    'event_name', v_invitation_event.event_name,
    'event_venue', v_invitation_event.event_venue,
    'checked_in_at', NOW(),
    'attendance_id', v_attendance_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error during check-in: ' || SQLERRM
    );
END;
$$;

-- Simple check-in function (matches your existing pattern)
CREATE OR REPLACE FUNCTION check_in_by_event_token(p_event_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ie_id UUID;
  v_attendance_id UUID;
BEGIN
  -- Find invitation_event by event_token
  SELECT id INTO v_ie_id 
  FROM invitation_events 
  WHERE event_token = p_event_token;
  
  IF v_ie_id IS NULL THEN
    RAISE EXCEPTION 'Invalid event token';
  END IF;

  -- Insert or update attendance record
  INSERT INTO attendance_v2 (invitation_event_id, checked_in_by)
  VALUES (v_ie_id, auth.uid())
  ON CONFLICT (invitation_event_id) 
  DO UPDATE SET 
    checked_in_at = NOW(),
    checked_in_by = auth.uid()
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

-- Function to get check-in statistics
CREATE OR REPLACE FUNCTION get_checkin_stats(p_event_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_invited INTEGER;
  v_total_checked_in INTEGER;
  v_checkin_rate NUMERIC;
  v_recent_checkins JSON;
BEGIN
  -- Get total invited count
  IF p_event_id IS NULL THEN
    -- All events
    SELECT COUNT(DISTINCT ie.id) INTO v_total_invited
    FROM invitation_events ie
    WHERE ie.status = 'accepted';
  ELSE
    -- Specific event
    SELECT COUNT(DISTINCT ie.id) INTO v_total_invited
    FROM invitation_events ie
    WHERE ie.event_id = p_event_id
    AND ie.status = 'accepted';
  END IF;

  -- Get total checked in count
  IF p_event_id IS NULL THEN
    SELECT COUNT(DISTINCT a.id) INTO v_total_checked_in
    FROM attendance_v2 a;
  ELSE
    SELECT COUNT(DISTINCT a.id) INTO v_total_checked_in
    FROM attendance_v2 a
    JOIN invitation_events ie ON a.invitation_event_id = ie.id
    WHERE ie.event_id = p_event_id;
  END IF;

  -- Calculate check-in rate
  IF v_total_invited > 0 THEN
    v_checkin_rate := ROUND((v_total_checked_in::NUMERIC / v_total_invited::NUMERIC) * 100, 2);
  ELSE
    v_checkin_rate := 0;
  END IF;

  -- Get recent check-ins (last 10)
  IF p_event_id IS NULL THEN
    SELECT json_agg(
      json_build_object(
        'guest_name', g.first_name || ' ' || g.last_name,
        'event_name', e.name,
        'checked_in_at', a.checked_in_at,
        'method', 'qr_code' -- Default method since attendance_v2 doesn't track method
      )
      ORDER BY a.checked_in_at DESC
    ) INTO v_recent_checkins
    FROM attendance_v2 a
    JOIN invitation_events ie ON a.invitation_event_id = ie.id
    JOIN invitations i ON ie.invitation_id = i.id
    JOIN guests g ON i.guest_id = g.id
    JOIN events e ON ie.event_id = e.id
    LIMIT 10;
  ELSE
    SELECT json_agg(
      json_build_object(
        'guest_name', g.first_name || ' ' || g.last_name,
        'event_name', e.name,
        'checked_in_at', a.checked_in_at,
        'method', 'qr_code' -- Default method since attendance_v2 doesn't track method
      )
      ORDER BY a.checked_in_at DESC
    ) INTO v_recent_checkins
    FROM attendance_v2 a
    JOIN invitation_events ie ON a.invitation_event_id = ie.id
    JOIN invitations i ON ie.invitation_id = i.id
    JOIN guests g ON i.guest_id = g.id
    JOIN events e ON ie.event_id = e.id
    WHERE ie.event_id = p_event_id
    LIMIT 10;
  END IF;

  RETURN json_build_object(
    'total_invited', v_total_invited,
    'total_checked_in', v_total_checked_in,
    'checkin_rate', v_checkin_rate,
    'recent_checkins', COALESCE(v_recent_checkins, '[]'::json)
  );
END;
$$;

-- Function to get guest check-in status
CREATE OR REPLACE FUNCTION get_guest_checkin_status(p_invite_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest RECORD;
  v_checkins JSON;
BEGIN
  -- Get guest info
  SELECT 
    g.id,
    g.first_name,
    g.last_name,
    g.email,
    g.invite_code
  INTO v_guest
  FROM guests g
  WHERE g.invite_code = p_invite_code;

  IF v_guest IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid invite code'
    );
  END IF;

  -- Get check-in status for all events
  SELECT json_agg(
    json_build_object(
      'event_id', e.id,
      'event_name', e.name,
      'event_date', e.starts_at,
      'event_venue', e.venue,
      'is_checked_in', a.id IS NOT NULL,
      'checked_in_at', a.checked_in_at,
      'method', 'qr_code' -- Default method since attendance_v2 doesn't track method
    )
  ) INTO v_checkins
  FROM events e
  LEFT JOIN invitation_events ie ON ie.event_id = e.id
  LEFT JOIN invitations i ON ie.invitation_id = i.id AND i.guest_id = v_guest.id
  LEFT JOIN attendance_v2 a ON a.invitation_event_id = ie.id
  WHERE ie.id IS NOT NULL -- Only show events where guest has invitation
  ORDER BY e.starts_at;

  RETURN json_build_object(
    'success', true,
    'guest', json_build_object(
      'id', v_guest.id,
      'first_name', v_guest.first_name,
      'last_name', v_guest.last_name,
      'email', v_guest.email,
      'invite_code', v_guest.invite_code
    ),
    'checkins', COALESCE(v_checkins, '[]'::json)
  );
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON attendance_v2 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_in_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_in_by_event_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_checkin_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_guest_checkin_status(TEXT) TO anon, authenticated;
