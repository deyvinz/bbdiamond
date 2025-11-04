-- Migration: Add dietary requirements and food choices support
-- This migration adds columns to invitation_events and creates wedding_food_choices table

-- Add dietary and food choice columns to invitation_events table
ALTER TABLE public.invitation_events
    ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT,
    ADD COLUMN IF NOT EXISTS dietary_information TEXT,
    ADD COLUMN IF NOT EXISTS food_choice TEXT;

-- Create wedding_food_choices table for admin-defined meal options
CREATE TABLE IF NOT EXISTS public.wedding_food_choices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wedding_food_choices_wedding_id ON public.wedding_food_choices(wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_food_choices_display_order ON public.wedding_food_choices(wedding_id, display_order);
CREATE INDEX IF NOT EXISTS idx_wedding_food_choices_active ON public.wedding_food_choices(wedding_id, is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_wedding_food_choices_updated_at
    BEFORE UPDATE ON public.wedding_food_choices
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.wedding_food_choices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to active food choices" ON public.wedding_food_choices
    FOR SELECT USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_food_choices.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow wedding owners to manage food choices" ON public.wedding_food_choices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = wedding_food_choices.wedding_id
            AND weddings.owner_id = auth.uid()
        )
    );

