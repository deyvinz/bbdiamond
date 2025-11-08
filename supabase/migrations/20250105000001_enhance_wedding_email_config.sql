-- Migration: Enhance wedding_email_config table for multi-tenant email system
-- Adds support for custom domains, branding, and advanced email configuration

-- Add new columns to wedding_email_config
ALTER TABLE public.wedding_email_config
ADD COLUMN IF NOT EXISTS verified_domain TEXT,
ADD COLUMN IF NOT EXISTS resend_domain_id TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS footer_html TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.wedding_email_config.verified_domain IS 'Custom domain verified in Resend (e.g., "johnandsarah.com")';
COMMENT ON COLUMN public.wedding_email_config.resend_domain_id IS 'Resend domain ID for API calls when using custom domain';
COMMENT ON COLUMN public.wedding_email_config.logo_url IS 'Email logo URL override (falls back to theme email_logo_url or logo_url)';
COMMENT ON COLUMN public.wedding_email_config.primary_color IS 'Brand color for emails (falls back to theme primary_color)';
COMMENT ON COLUMN public.wedding_email_config.footer_html IS 'Custom HTML footer for emails';

-- Create index for verified_domain lookups
CREATE INDEX IF NOT EXISTS idx_wedding_email_config_verified_domain 
ON public.wedding_email_config(verified_domain) 
WHERE verified_domain IS NOT NULL;

