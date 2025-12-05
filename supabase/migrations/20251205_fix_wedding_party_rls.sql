-- Migration: Fix RLS policies for wedding_party and other admin tables
-- Date: 2025-12-05
-- Description: Ensures wedding owners (from wedding_owners table) and admin/staff users
--              can properly manage wedding-related content tables.

-- ============================================================================
-- Helper function: Check if user owns a wedding (via wedding_owners table)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_wedding_owner(check_wedding_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM wedding_owners 
    WHERE wedding_id = check_wedding_id 
    AND customer_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper function: Check if user is admin or staff for a wedding
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_wedding_admin_or_staff(check_wedding_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND wedding_id = check_wedding_id
    AND role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Combined helper: Check if user has admin access to wedding
-- (owner via wedding_owners OR admin/staff role)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_wedding_admin_access(check_wedding_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN 
    public.is_wedding_owner(check_wedding_id) 
    OR public.is_wedding_admin_or_staff(check_wedding_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- WEDDING_PARTY TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on wedding_party if not already enabled
ALTER TABLE wedding_party ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view wedding party" ON wedding_party;
DROP POLICY IF EXISTS "Wedding owners can insert wedding party members" ON wedding_party;
DROP POLICY IF EXISTS "Wedding owners can update wedding party members" ON wedding_party;
DROP POLICY IF EXISTS "Wedding owners can delete wedding party members" ON wedding_party;
DROP POLICY IF EXISTS "Admins can manage wedding party" ON wedding_party;

-- SELECT: Public read access (wedding party is typically displayed on public wedding pages)
CREATE POLICY "Anyone can view wedding party"
  ON wedding_party FOR SELECT
  USING (true);

-- INSERT: Wedding owners and admin/staff can add members
CREATE POLICY "Wedding owners can insert wedding party members"
  ON wedding_party FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE: Wedding owners and admin/staff can update members
CREATE POLICY "Wedding owners can update wedding party members"
  ON wedding_party FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE: Wedding owners and admin/staff can delete members
CREATE POLICY "Wedding owners can delete wedding party members"
  ON wedding_party FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- FAQ_ITEMS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on faq_items if not already enabled
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view FAQ items" ON faq_items;
DROP POLICY IF EXISTS "Wedding owners can insert FAQ items" ON faq_items;
DROP POLICY IF EXISTS "Wedding owners can update FAQ items" ON faq_items;
DROP POLICY IF EXISTS "Wedding owners can delete FAQ items" ON faq_items;

-- SELECT: Public read access
CREATE POLICY "Anyone can view FAQ items"
  ON faq_items FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert FAQ items"
  ON faq_items FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update FAQ items"
  ON faq_items FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete FAQ items"
  ON faq_items FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- REGISTRIES TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on registries if not already enabled
ALTER TABLE registries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view registries" ON registries;
DROP POLICY IF EXISTS "Wedding owners can insert registries" ON registries;
DROP POLICY IF EXISTS "Wedding owners can update registries" ON registries;
DROP POLICY IF EXISTS "Wedding owners can delete registries" ON registries;

-- SELECT: Public read access
CREATE POLICY "Anyone can view registries"
  ON registries FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert registries"
  ON registries FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update registries"
  ON registries FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete registries"
  ON registries FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- THINGS_TO_DO TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on things_to_do if not already enabled
ALTER TABLE things_to_do ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view things to do" ON things_to_do;
DROP POLICY IF EXISTS "Wedding owners can insert things to do" ON things_to_do;
DROP POLICY IF EXISTS "Wedding owners can update things to do" ON things_to_do;
DROP POLICY IF EXISTS "Wedding owners can delete things to do" ON things_to_do;

-- SELECT: Public read access
CREATE POLICY "Anyone can view things to do"
  ON things_to_do FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert things to do"
  ON things_to_do FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update things to do"
  ON things_to_do FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete things to do"
  ON things_to_do FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- HOMEPAGE_CTAS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on homepage_ctas if not already enabled
ALTER TABLE homepage_ctas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view homepage CTAs" ON homepage_ctas;
DROP POLICY IF EXISTS "Wedding owners can insert homepage CTAs" ON homepage_ctas;
DROP POLICY IF EXISTS "Wedding owners can update homepage CTAs" ON homepage_ctas;
DROP POLICY IF EXISTS "Wedding owners can delete homepage CTAs" ON homepage_ctas;

-- SELECT: Public read access
CREATE POLICY "Anyone can view homepage CTAs"
  ON homepage_ctas FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert homepage CTAs"
  ON homepage_ctas FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update homepage CTAs"
  ON homepage_ctas FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete homepage CTAs"
  ON homepage_ctas FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- GUEST_NOTES TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on guest_notes if not already enabled
ALTER TABLE guest_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Wedding owners can view guest notes" ON guest_notes;
DROP POLICY IF EXISTS "Wedding owners can insert guest notes" ON guest_notes;
DROP POLICY IF EXISTS "Wedding owners can update guest notes" ON guest_notes;
DROP POLICY IF EXISTS "Wedding owners can delete guest notes" ON guest_notes;

-- SELECT: Only wedding owners/staff can view
CREATE POLICY "Wedding owners can view guest notes"
  ON guest_notes FOR SELECT
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- INSERT
CREATE POLICY "Wedding owners can insert guest notes"
  ON guest_notes FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update guest notes"
  ON guest_notes FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete guest notes"
  ON guest_notes FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- FOOD_CHOICES TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on food_choices if not already enabled
ALTER TABLE food_choices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view food choices" ON food_choices;
DROP POLICY IF EXISTS "Wedding owners can insert food choices" ON food_choices;
DROP POLICY IF EXISTS "Wedding owners can update food choices" ON food_choices;
DROP POLICY IF EXISTS "Wedding owners can delete food choices" ON food_choices;

-- SELECT: Public read access (guests need to see options)
CREATE POLICY "Anyone can view food choices"
  ON food_choices FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert food choices"
  ON food_choices FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update food choices"
  ON food_choices FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete food choices"
  ON food_choices FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- GALLERY_ITEMS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on gallery_items if not already enabled
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Wedding owners can insert gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Wedding owners can update gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Wedding owners can delete gallery items" ON gallery_items;

-- SELECT: Public read access
CREATE POLICY "Anyone can view gallery items"
  ON gallery_items FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert gallery items"
  ON gallery_items FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update gallery items"
  ON gallery_items FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete gallery items"
  ON gallery_items FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- TRAVEL_SECTIONS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on travel_sections if not already enabled
ALTER TABLE travel_sections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view travel sections" ON travel_sections;
DROP POLICY IF EXISTS "Wedding owners can insert travel sections" ON travel_sections;
DROP POLICY IF EXISTS "Wedding owners can update travel sections" ON travel_sections;
DROP POLICY IF EXISTS "Wedding owners can delete travel sections" ON travel_sections;

-- SELECT: Public read access
CREATE POLICY "Anyone can view travel sections"
  ON travel_sections FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert travel sections"
  ON travel_sections FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update travel sections"
  ON travel_sections FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete travel sections"
  ON travel_sections FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- TRAVEL_ITEMS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on travel_items if not already enabled
ALTER TABLE travel_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view travel items" ON travel_items;
DROP POLICY IF EXISTS "Wedding owners can insert travel items" ON travel_items;
DROP POLICY IF EXISTS "Wedding owners can update travel items" ON travel_items;
DROP POLICY IF EXISTS "Wedding owners can delete travel items" ON travel_items;

-- SELECT: Public read access
CREATE POLICY "Anyone can view travel items"
  ON travel_items FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert travel items"
  ON travel_items FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update travel items"
  ON travel_items FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete travel items"
  ON travel_items FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- WEDDING_CONFIG TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on wedding_config if not already enabled
ALTER TABLE wedding_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view wedding config" ON wedding_config;
DROP POLICY IF EXISTS "Wedding owners can insert wedding config" ON wedding_config;
DROP POLICY IF EXISTS "Wedding owners can update wedding config" ON wedding_config;
DROP POLICY IF EXISTS "Wedding owners can delete wedding config" ON wedding_config;

-- SELECT: Public read access (config affects what guests see)
CREATE POLICY "Anyone can view wedding config"
  ON wedding_config FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert wedding config"
  ON wedding_config FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update wedding config"
  ON wedding_config FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete wedding config"
  ON wedding_config FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- WEDDING_EMAIL_CONFIG TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on wedding_email_config if not already enabled
ALTER TABLE wedding_email_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Wedding owners can view email config" ON wedding_email_config;
DROP POLICY IF EXISTS "Wedding owners can insert email config" ON wedding_email_config;
DROP POLICY IF EXISTS "Wedding owners can update email config" ON wedding_email_config;
DROP POLICY IF EXISTS "Wedding owners can delete email config" ON wedding_email_config;

-- SELECT: Only wedding owners/staff can view email config
CREATE POLICY "Wedding owners can view email config"
  ON wedding_email_config FOR SELECT
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- INSERT
CREATE POLICY "Wedding owners can insert email config"
  ON wedding_email_config FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update email config"
  ON wedding_email_config FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete email config"
  ON wedding_email_config FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- EVENTS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on events if not already enabled
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Wedding owners can insert events" ON events;
DROP POLICY IF EXISTS "Wedding owners can update events" ON events;
DROP POLICY IF EXISTS "Wedding owners can delete events" ON events;

-- SELECT: Public read access (guests see event details)
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (true);

-- INSERT
CREATE POLICY "Wedding owners can insert events"
  ON events FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update events"
  ON events FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete events"
  ON events FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- ANNOUNCEMENTS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on announcements if not already enabled
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Wedding owners can view announcements" ON announcements;
DROP POLICY IF EXISTS "Wedding owners can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Wedding owners can update announcements" ON announcements;
DROP POLICY IF EXISTS "Wedding owners can delete announcements" ON announcements;

-- SELECT: Only wedding owners/staff can view announcements
CREATE POLICY "Wedding owners can view announcements"
  ON announcements FOR SELECT
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- INSERT
CREATE POLICY "Wedding owners can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update announcements"
  ON announcements FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete announcements"
  ON announcements FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- ANNOUNCEMENT_BATCHES TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on announcement_batches if not already enabled
ALTER TABLE announcement_batches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Wedding owners can view announcement batches" ON announcement_batches;
DROP POLICY IF EXISTS "Wedding owners can insert announcement batches" ON announcement_batches;
DROP POLICY IF EXISTS "Wedding owners can update announcement batches" ON announcement_batches;
DROP POLICY IF EXISTS "Wedding owners can delete announcement batches" ON announcement_batches;

-- SELECT
CREATE POLICY "Wedding owners can view announcement batches"
  ON announcement_batches FOR SELECT
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- INSERT
CREATE POLICY "Wedding owners can insert announcement batches"
  ON announcement_batches FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update announcement batches"
  ON announcement_batches FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete announcement batches"
  ON announcement_batches FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- ANNOUNCEMENT_RECIPIENTS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on announcement_recipients if not already enabled
ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Wedding owners can view announcement recipients" ON announcement_recipients;
DROP POLICY IF EXISTS "Wedding owners can insert announcement recipients" ON announcement_recipients;
DROP POLICY IF EXISTS "Wedding owners can update announcement recipients" ON announcement_recipients;
DROP POLICY IF EXISTS "Wedding owners can delete announcement recipients" ON announcement_recipients;

-- SELECT
CREATE POLICY "Wedding owners can view announcement recipients"
  ON announcement_recipients FOR SELECT
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- INSERT
CREATE POLICY "Wedding owners can insert announcement recipients"
  ON announcement_recipients FOR INSERT
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- UPDATE
CREATE POLICY "Wedding owners can update announcement recipients"
  ON announcement_recipients FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- DELETE
CREATE POLICY "Wedding owners can delete announcement recipients"
  ON announcement_recipients FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- ============================================================================
-- Grant execute permissions on helper functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.is_wedding_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wedding_admin_or_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_wedding_admin_access(UUID) TO authenticated;

