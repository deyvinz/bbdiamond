-- Migration: Add WhatsApp support for invitations
-- This allows sending invitations via WhatsApp for guests without email

-- Add phone_number and preferred_contact_method to guests table
ALTER TABLE public.guests
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'whatsapp', 'both'));

COMMENT ON COLUMN public.guests.phone_number IS 'Phone number for WhatsApp invitations (E.164 format recommended)';
COMMENT ON COLUMN public.guests.preferred_contact_method IS 'Preferred contact method: email, whatsapp, or both';

-- Add whatsapp_sent_at to invitations table
ALTER TABLE public.invitations
    ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.invitations.whatsapp_sent_at IS 'Timestamp when invitation was sent via WhatsApp';

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_guests_phone_number ON public.guests(phone_number) WHERE phone_number IS NOT NULL;

