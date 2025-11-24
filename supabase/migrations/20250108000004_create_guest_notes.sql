-- Migration: Create guest_notes table and add enable_guest_notes to weddings
-- This allows guests to submit notes, well wishes, or memories about the couple

-- Add enable_guest_notes to weddings table
ALTER TABLE public.weddings
    ADD COLUMN IF NOT EXISTS enable_guest_notes BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.weddings.enable_guest_notes IS 'Whether to enable the guest notes/well wishes page';

-- Create guest_notes table
CREATE TABLE IF NOT EXISTS public.guest_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    guest_name TEXT, -- For anonymous submissions
    message TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guest_notes_wedding_id ON public.guest_notes(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_notes_approved ON public.guest_notes(wedding_id, is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_guest_notes_guest_id ON public.guest_notes(guest_id);

-- Add updated_at trigger
CREATE TRIGGER update_guest_notes_updated_at
    BEFORE UPDATE ON public.guest_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.guest_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public to view approved guest notes"
    ON public.guest_notes FOR SELECT
    USING (
        is_approved = true
        AND EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = guest_notes.wedding_id
            AND weddings.status = 'active'
        )
    );

CREATE POLICY "Allow public to create guest notes"
    ON public.guest_notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.weddings
            WHERE weddings.id = guest_notes.wedding_id
            AND weddings.status = 'active'
            AND weddings.enable_guest_notes = true
        )
    );

CREATE POLICY "Allow wedding owners to manage guest notes"
    ON public.guest_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM wedding_owners
            WHERE wedding_owners.wedding_id = guest_notes.wedding_id
            AND wedding_owners.customer_id = auth.uid()
        )
    );

