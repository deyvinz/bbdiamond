-- Migration: Create content tables to replace JSON files
-- This migration creates tables for wedding party, travel info, FAQ, and gallery

-- Create wedding_party table (replaces wedding-party.json)
CREATE TABLE IF NOT EXISTS public.wedding_party (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- e.g., "Maid of Honor", "Bestman", "Bridesmaid", "Groomsman"
    image_url TEXT,
    bio TEXT, -- Optional biography
    display_order INTEGER DEFAULT 0, -- For ordering display
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create travel_info_sections table (for travel page sections)
CREATE TABLE IF NOT EXISTS public.travel_info_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL CHECK (section_type IN ('accommodation', 'transportation', 'local-info')),
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create travel_info_items table (for hotels, transportation options, etc.)
CREATE TABLE IF NOT EXISTS public.travel_info_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.travel_info_sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    phone TEXT,
    website TEXT,
    details JSONB, -- Array of strings for additional details
    tips JSONB, -- Array of strings for tips
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create faq_items table
CREATE TABLE IF NOT EXISTS public.faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gallery_images table
CREATE TABLE IF NOT EXISTS public.gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text TEXT,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wedding_party_wedding_id ON public.wedding_party(wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_party_display_order ON public.wedding_party(wedding_id, display_order);
CREATE INDEX IF NOT EXISTS idx_travel_info_sections_wedding_id ON public.travel_info_sections(wedding_id);
CREATE INDEX IF NOT EXISTS idx_travel_info_sections_type ON public.travel_info_sections(wedding_id, section_type);
CREATE INDEX IF NOT EXISTS idx_travel_info_items_section_id ON public.travel_info_items(section_id);
CREATE INDEX IF NOT EXISTS idx_travel_info_items_display_order ON public.travel_info_items(section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_faq_items_wedding_id ON public.faq_items(wedding_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_display_order ON public.faq_items(wedding_id, display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_images_wedding_id ON public.gallery_images(wedding_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_display_order ON public.gallery_images(wedding_id, display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_images_featured ON public.gallery_images(wedding_id, is_featured);

-- Add updated_at triggers
CREATE TRIGGER update_wedding_party_updated_at
    BEFORE UPDATE ON public.wedding_party
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_travel_info_sections_updated_at
    BEFORE UPDATE ON public.travel_info_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_travel_info_items_updated_at
    BEFORE UPDATE ON public.travel_info_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_faq_items_updated_at
    BEFORE UPDATE ON public.faq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_gallery_images_updated_at
    BEFORE UPDATE ON public.gallery_images
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.wedding_party ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_info_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_info_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to wedding party" ON public.wedding_party
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_party.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow wedding owners to manage wedding party" ON public.wedding_party
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_party.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow public read access to travel info" ON public.travel_info_sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = travel_info_sections.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow wedding owners to manage travel info" ON public.travel_info_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = travel_info_sections.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow public read access to travel info items" ON public.travel_info_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.travel_info_sections
            JOIN public.weddings ON weddings.id = travel_info_sections.wedding_id
            WHERE travel_info_sections.id = travel_info_items.section_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow wedding owners to manage travel info items" ON public.travel_info_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.travel_info_sections
            JOIN public.weddings ON weddings.id = travel_info_sections.wedding_id
            WHERE travel_info_sections.id = travel_info_items.section_id
            AND weddings.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow public read access to FAQ items" ON public.faq_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = faq_items.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow wedding owners to manage FAQ items" ON public.faq_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = faq_items.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

CREATE POLICY "Allow public read access to gallery images" ON public.gallery_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = gallery_images.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow wedding owners to manage gallery images" ON public.gallery_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = gallery_images.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

