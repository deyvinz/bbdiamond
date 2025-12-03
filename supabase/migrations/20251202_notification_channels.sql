-- Migration: Add multi-channel notification support
-- Date: 2025-12-02
-- Description: Adds SMS tracking columns to invitations table and channel column to mail_logs

-- 1. Add SMS tracking columns to invitations table
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_message_id TEXT;

-- 2. Add channel column to mail_logs for tracking email/whatsapp/sms
ALTER TABLE mail_logs
ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'email';

-- Add constraint to ensure valid channel values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mail_logs_channel_check'
  ) THEN
    ALTER TABLE mail_logs
    ADD CONSTRAINT mail_logs_channel_check
    CHECK (channel IN ('email', 'whatsapp', 'sms'));
  END IF;
END $$;

-- 3. Add message_id column to mail_logs if not exists (for tracking SMS/WhatsApp message IDs)
ALTER TABLE mail_logs
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- 4. Create index for channel-based queries
CREATE INDEX IF NOT EXISTS idx_mail_logs_channel ON mail_logs(channel);

-- 5. Create index for SMS sent lookups
CREATE INDEX IF NOT EXISTS idx_invitations_sms_sent ON invitations(sms_sent_at) WHERE sms_sent_at IS NOT NULL;

-- 6. Optional: Create WhatsApp registration cache table for storing registration status
-- This can be used to persist WhatsApp registration checks beyond server restarts
CREATE TABLE IF NOT EXISTS whatsapp_registration_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  is_registered BOOLEAN NOT NULL DEFAULT false,
  wa_id TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(wedding_id, phone_number)
);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_cache_phone ON whatsapp_registration_cache(wedding_id, phone_number);

-- Add comment describing the table
COMMENT ON TABLE whatsapp_registration_cache IS 'Caches WhatsApp registration status for phone numbers to reduce API calls. Entries should be considered stale after 24 hours.';

-- 7. Add RLS policies for whatsapp_registration_cache
ALTER TABLE whatsapp_registration_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their wedding whatsapp cache" ON whatsapp_registration_cache;
DROP POLICY IF EXISTS "Users can insert their wedding whatsapp cache" ON whatsapp_registration_cache;
DROP POLICY IF EXISTS "Users can update their wedding whatsapp cache" ON whatsapp_registration_cache;
DROP POLICY IF EXISTS "Users can delete their wedding whatsapp cache" ON whatsapp_registration_cache;

-- Policy: Users can only access their wedding's cache entries
-- Supports both direct ownership (owner_id) and multi-tenant ownership (wedding_owners)
CREATE POLICY "Users can view their wedding whatsapp cache"
  ON whatsapp_registration_cache FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
    OR
    wedding_id IN (
      SELECT wedding_id FROM wedding_owners WHERE customer_id = auth.uid()
    )
  );

-- Policy: Users can insert cache entries for their weddings
CREATE POLICY "Users can insert their wedding whatsapp cache"
  ON whatsapp_registration_cache FOR INSERT
  WITH CHECK (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
    OR
    wedding_id IN (
      SELECT wedding_id FROM wedding_owners WHERE customer_id = auth.uid()
    )
  );

-- Policy: Users can update their wedding's cache entries
-- USING: checks existing row ownership
-- WITH CHECK: prevents changing wedding_id to a wedding they don't own
CREATE POLICY "Users can update their wedding whatsapp cache"
  ON whatsapp_registration_cache FOR UPDATE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
    OR
    wedding_id IN (
      SELECT wedding_id FROM wedding_owners WHERE customer_id = auth.uid()
    )
  )
  WITH CHECK (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
    OR
    wedding_id IN (
      SELECT wedding_id FROM wedding_owners WHERE customer_id = auth.uid()
    )
  );

-- Policy: Users can delete their wedding's cache entries
CREATE POLICY "Users can delete their wedding whatsapp cache"
  ON whatsapp_registration_cache FOR DELETE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
    OR
    wedding_id IN (
      SELECT wedding_id FROM wedding_owners WHERE customer_id = auth.uid()
    )
  );
