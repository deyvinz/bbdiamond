-- Backfill script to update channel and guest_name for existing notification_logs
-- Run this script to populate channel and guest_name fields for existing records

-- Step 1: Update channel field
-- Priority: column value > parameters.channel > inference from recipient info
UPDATE notification_logs
SET channel = CASE
  -- If channel column already has a value, keep it
  WHEN channel IS NOT NULL AND channel IN ('email', 'sms', 'whatsapp') THEN channel
  
  -- If channel is in parameters, use that
  WHEN parameters->>'channel' IN ('email', 'sms', 'whatsapp') THEN parameters->>'channel'
  
  -- Infer from recipient info: if phone exists and email doesn't, it's SMS
  WHEN recipient_phone IS NOT NULL AND recipient_phone != '' 
       AND (recipient_email IS NULL OR recipient_email = '') THEN 'sms'
  
  -- If email exists, default to email
  WHEN recipient_email IS NOT NULL AND recipient_email != '' THEN 'email'
  
  -- Default fallback
  ELSE 'email'
END
WHERE channel IS NULL 
   OR (channel NOT IN ('email', 'sms', 'whatsapp') AND parameters->>'channel' IS NOT NULL)
   OR (channel IS NULL AND recipient_email IS NOT NULL)
   OR (channel IS NULL AND recipient_phone IS NOT NULL);

-- Step 2: Update guest_name field
-- Match guests by: recipient_id (if UUID), email, or phone
UPDATE notification_logs nl
SET guest_name = COALESCE(
  -- Try to match by recipient_id if it's a UUID (guest ID)
  (
    SELECT TRIM(g.first_name || ' ' || g.last_name)
    FROM guests g
    WHERE g.id::text = nl.recipient_id
      AND g.wedding_id = nl.wedding_id
    LIMIT 1
  ),
  -- Try to match by email
  (
    SELECT TRIM(g.first_name || ' ' || g.last_name)
    FROM guests g
    WHERE g.email = nl.recipient_email
      AND g.wedding_id = nl.wedding_id
      AND nl.recipient_email IS NOT NULL
      AND nl.recipient_email != ''
    LIMIT 1
  ),
  -- Try to match by phone
  (
    SELECT TRIM(g.first_name || ' ' || g.last_name)
    FROM guests g
    WHERE g.phone = nl.recipient_phone
      AND g.wedding_id = nl.wedding_id
      AND nl.recipient_phone IS NOT NULL
      AND nl.recipient_phone != ''
    LIMIT 1
  )
)
WHERE guest_name IS NULL
  AND (
    -- Only update if we have a way to match (recipient_id as UUID, email, or phone)
    (recipient_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    OR (recipient_email IS NOT NULL AND recipient_email != '')
    OR (recipient_phone IS NOT NULL AND recipient_phone != '')
  );

-- Optional: Show summary of updates
SELECT 
  'Channel updates' as update_type,
  COUNT(*) as records_updated
FROM notification_logs
WHERE channel IS NOT NULL
UNION ALL
SELECT 
  'Guest name updates' as update_type,
  COUNT(*) as records_updated
FROM notification_logs
WHERE guest_name IS NOT NULL;
