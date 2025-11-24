-- Migration: Create homepage_ctas table for customizable CTA buttons
-- This allows wedding owners to customize homepage call-to-action buttons

CREATE TABLE IF NOT EXISTS public.homepage_ctas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    href TEXT NOT NULL,
    variant TEXT NOT NULL DEFAULT 'bordered' CHECK (variant IN ('primary', 'bordered')),
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_homepage_ctas_wedding_id ON public.homepage_ctas(wedding_id);
CREATE INDEX IF NOT EXISTS idx_homepage_ctas_display_order ON public.homepage_ctas(wedding_id, display_order);

-- Add updated_at trigger
CREATE TRIGGER update_homepage_ctas_updated_at
    BEFORE UPDATE ON public.homepage_ctas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.homepage_ctas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to visible CTAs"
    ON public.homepage_ctas FOR SELECT
    USING (
        is_visible = true
        AND EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = homepage_ctas.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow wedding owners to manage CTAs"
    ON public.homepage_ctas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM wedding_owners
            WHERE wedding_owners.wedding_id = homepage_ctas.wedding_id
            AND wedding_owners.customer_id = auth.uid()
        )
    );

