-- Migration: Create weddings and wedding_themes tables
-- This migration creates the core multi-tenancy tables

-- Create weddings table for tenant configuration
CREATE TABLE IF NOT EXISTS public.weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "brenda-diamond")
    bride_name TEXT NOT NULL,
    groom_name TEXT NOT NULL,
    couple_display_name TEXT NOT NULL, -- e.g., "Brenda & Diamond"
    hashtag TEXT, -- e.g., "#BrendaBagsHerDiamond"
    
    -- Dates
    primary_date TIMESTAMPTZ NOT NULL,
    secondary_dates JSONB, -- Array of additional dates
    
    -- Location
    venue_name TEXT NOT NULL,
    venue_address TEXT,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Contact Information
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    coordinator_email TEXT,
    
    -- Domain Settings
    custom_domain TEXT UNIQUE, -- For white-label domains (e.g., "brendabagsherdiamond.com")
    subdomain TEXT UNIQUE, -- For subdomain routing (e.g., "brenda-diamond")
    
    -- Feature Flags
    enable_gallery BOOLEAN DEFAULT true,
    enable_registry BOOLEAN DEFAULT true,
    enable_travel BOOLEAN DEFAULT true,
    enable_wedding_party BOOLEAN DEFAULT true,
    enable_faq BOOLEAN DEFAULT true,
    
    -- Social Links
    registry_url TEXT,
    travel_url TEXT,
    gallery_url TEXT,
    
    -- Metadata
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wedding_themes table for design customization
CREATE TABLE IF NOT EXISTS public.wedding_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    
    -- Color Palette
    primary_color TEXT DEFAULT '#CDA349', -- Main brand color
    secondary_color TEXT DEFAULT '#B38D39',
    accent_color TEXT DEFAULT '#E1B858',
    gold_50 TEXT DEFAULT '#FFF8E6',
    gold_100 TEXT DEFAULT '#FDECC8',
    gold_200 TEXT DEFAULT '#F7DC9F',
    gold_300 TEXT DEFAULT '#EEC874',
    gold_400 TEXT DEFAULT '#E1B858',
    gold_500 TEXT DEFAULT '#CDA349',
    gold_600 TEXT DEFAULT '#B38D39',
    gold_700 TEXT DEFAULT '#8C6E2C',
    gold_800 TEXT DEFAULT '#6B531F',
    gold_900 TEXT DEFAULT '#4A3915',
    
    -- Typography
    primary_font TEXT DEFAULT 'Inter', -- Sans-serif font
    secondary_font TEXT DEFAULT 'Playfair Display', -- Serif font
    primary_font_weights JSONB DEFAULT '["400", "500", "600"]'::jsonb,
    secondary_font_weights JSONB DEFAULT '["400", "600", "700"]'::jsonb,
    
    -- Logo URLs
    logo_url TEXT, -- Main logo
    favicon_url TEXT, -- Favicon
    email_logo_url TEXT, -- Logo for emails
    
    -- Background
    background_pattern TEXT, -- Background pattern/image
    background_color TEXT DEFAULT '#FFFFFF',
    
    -- Additional Styling
    border_radius TEXT DEFAULT '0.625rem',
    shadow_style TEXT, -- Custom shadow CSS
    
    -- Custom CSS Variables (stored as JSON)
    custom_css_vars JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(wedding_id)
);

-- Create wedding_domains table for domain mapping
CREATE TABLE IF NOT EXISTS public.wedding_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE, -- Full domain (e.g., "brendabagsherdiamond.com")
    is_primary BOOLEAN DEFAULT false, -- Primary domain for the wedding
    is_verified BOOLEAN DEFAULT false, -- Domain ownership verification
    verification_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wedding_config table (replaces app_config, scoped per wedding)
CREATE TABLE IF NOT EXISTS public.wedding_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wedding_id, key)
);

-- Create wedding_email_config table
CREATE TABLE IF NOT EXISTS public.wedding_email_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    from_name TEXT DEFAULT 'Wedding',
    from_email TEXT NOT NULL,
    reply_to_email TEXT,
    invitation_subject_template TEXT DEFAULT 'You''re Invited, {guest_name} — {event_name}',
    rsvp_confirmation_subject_template TEXT DEFAULT 'RSVP Confirmation — {event_name}',
    custom_footer_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wedding_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weddings_slug ON public.weddings(slug);
CREATE INDEX IF NOT EXISTS idx_weddings_custom_domain ON public.weddings(custom_domain);
CREATE INDEX IF NOT EXISTS idx_weddings_subdomain ON public.weddings(subdomain);
CREATE INDEX IF NOT EXISTS idx_weddings_owner_id ON public.weddings(owner_id);
CREATE INDEX IF NOT EXISTS idx_wedding_themes_wedding_id ON public.wedding_themes(wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_domains_wedding_id ON public.wedding_domains(wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_domains_domain ON public.wedding_domains(domain);
CREATE INDEX IF NOT EXISTS idx_wedding_config_wedding_id ON public.wedding_config(wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_email_config_wedding_id ON public.wedding_email_config(wedding_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_weddings_updated_at
    BEFORE UPDATE ON public.weddings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_wedding_themes_updated_at
    BEFORE UPDATE ON public.wedding_themes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_wedding_domains_updated_at
    BEFORE UPDATE ON public.wedding_domains
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_wedding_config_updated_at
    BEFORE UPDATE ON public.wedding_config
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_wedding_email_config_updated_at
    BEFORE UPDATE ON public.wedding_email_config
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_email_config ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (will be enhanced in later migration)
CREATE POLICY "Allow public read access to active weddings" ON public.weddings
    FOR SELECT USING (status = 'active');

CREATE POLICY "Allow wedding owners to manage their weddings" ON public.weddings
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Allow public read access to wedding themes" ON public.wedding_themes
    FOR SELECT USING (true);

CREATE POLICY "Allow wedding owners to manage their themes" ON public.wedding_themes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_themes.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow public read access to wedding domains" ON public.wedding_domains
    FOR SELECT USING (is_verified = true);

CREATE POLICY "Allow wedding owners to manage their domains" ON public.wedding_domains
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_domains.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow wedding owners to manage their config" ON public.wedding_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_config.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow wedding owners to manage their email config" ON public.wedding_email_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_email_config.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

