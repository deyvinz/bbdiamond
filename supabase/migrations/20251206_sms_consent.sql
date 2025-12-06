-- Migration: Add SMS consent opt-in table for Twilio compliance
-- Date: 2025-12-06
-- Description: Creates a table to store SMS notification opt-in consent from guests

-- Create sms_consent table
CREATE TABLE IF NOT EXISTS sms_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consent_message TEXT, -- Store the consent message they agreed to
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT, -- For audit trail
  user_agent TEXT, -- For audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each phone number can only have one consent record per wedding
  UNIQUE(wedding_id, phone_number)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sms_consent_wedding ON sms_consent(wedding_id);
CREATE INDEX IF NOT EXISTS idx_sms_consent_phone ON sms_consent(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_consent_timestamp ON sms_consent(consent_timestamp);

-- Enable RLS
ALTER TABLE sms_consent ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can insert (for opt-in from landing page)
CREATE POLICY "Anyone can opt in for SMS consent"
  ON sms_consent FOR INSERT
  WITH CHECK (true);

-- Wedding owners can view their consent records
CREATE POLICY "Wedding owners can view SMS consent"
  ON sms_consent FOR SELECT
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- Wedding owners can update consent records
CREATE POLICY "Wedding owners can update SMS consent"
  ON sms_consent FOR UPDATE
  USING (
    public.has_wedding_admin_access(wedding_id)
  )
  WITH CHECK (
    public.has_wedding_admin_access(wedding_id)
  );

-- Wedding owners can delete consent records
CREATE POLICY "Wedding owners can delete SMS consent"
  ON sms_consent FOR DELETE
  USING (
    public.has_wedding_admin_access(wedding_id)
  );

-- Comment on table
COMMENT ON TABLE sms_consent IS 'Stores SMS notification opt-in consent for Twilio compliance';

