-- Migration: Create storage bucket policies for wedding-specific buckets
-- This migration creates policies for Supabase Storage buckets following the pattern: wedding-{wedding_id}

-- Helper function to extract wedding_id from bucket name
-- Bucket names follow the pattern: wedding-{wedding_id}
-- Note: Functions must be in public schema, not storage schema
CREATE OR REPLACE FUNCTION public.extract_wedding_id_from_bucket(bucket_name TEXT)
RETURNS UUID AS $$
DECLARE
  wedding_id_part TEXT;
  wedding_uuid UUID;
BEGIN
  -- Extract the part after 'wedding-' prefix
  IF bucket_name LIKE 'wedding-%' THEN
    wedding_id_part := substring(bucket_name from '^wedding-(.+)$');
    BEGIN
      wedding_uuid := wedding_id_part::UUID;
      RETURN wedding_uuid;
    EXCEPTION WHEN OTHERS THEN
      -- If it's not a valid UUID, return NULL
      RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if user has access to a wedding bucket
CREATE OR REPLACE FUNCTION public.user_has_wedding_bucket_access(bucket_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  wedding_uuid UUID;
  user_id UUID;
BEGIN
  -- Get current user ID - must be available in storage policy context
  user_id := auth.uid();
  
  -- If no user, deny access
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Only apply access control to wedding-{wedding_id} buckets
  IF bucket_name NOT LIKE 'wedding-%' THEN
    -- For other buckets (like 'bdiamond'), allow access (existing behavior)
    RETURN true;
  END IF;

  -- Extract wedding_id from bucket name
  wedding_uuid := public.extract_wedding_id_from_bucket(bucket_name);
  
  IF wedding_uuid IS NULL THEN
    RETURN false;
  END IF;

  -- Use the existing user_has_wedding_access function
  RETURN public.user_has_wedding_access(wedding_uuid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Storage policies for wedding-specific buckets

-- Policy: Public read access for wedding buckets
-- Allows anyone to view/download images from wedding buckets (for gallery, wedding party photos)
CREATE POLICY "Public can read from wedding buckets"
ON storage.objects FOR SELECT
USING (
  bucket_id IN (
    SELECT id FROM storage.buckets 
    WHERE name LIKE 'wedding-%'
  )
);

-- Policy: Authenticated users with wedding access can upload to wedding buckets
-- Similar pattern to: "Enable insert for users based on user_id"
-- Checks if user has access to the wedding associated with the bucket
CREATE POLICY "Enable insert for users with wedding access"
ON storage.objects FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' 
  AND EXISTS (
    SELECT 1 
    FROM storage.buckets 
    WHERE storage.buckets.id = bucket_id
    AND storage.buckets.name LIKE 'wedding-%'
    AND public.user_has_wedding_bucket_access(storage.buckets.name) = true
  )
);

-- Policy: Authenticated users with wedding access can update files in wedding buckets
CREATE POLICY "Enable update for users with wedding access"
ON storage.objects FOR UPDATE
USING (
  auth.role() = 'authenticated' 
  AND EXISTS (
    SELECT 1 
    FROM storage.buckets 
    WHERE storage.buckets.id = bucket_id
    AND storage.buckets.name LIKE 'wedding-%'
    AND public.user_has_wedding_bucket_access(storage.buckets.name) = true
  )
);

-- Policy: Authenticated users with wedding access can delete files from wedding buckets
CREATE POLICY "Enable delete for users with wedding access"
ON storage.objects FOR DELETE
USING (
  auth.role() = 'authenticated' 
  AND EXISTS (
    SELECT 1 
    FROM storage.buckets 
    WHERE storage.buckets.id = bucket_id
    AND storage.buckets.name LIKE 'wedding-%'
    AND public.user_has_wedding_bucket_access(storage.buckets.name) = true
  )
);

