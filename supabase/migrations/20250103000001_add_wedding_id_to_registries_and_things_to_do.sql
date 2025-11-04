-- Migration: Add wedding_id columns to registries and things_to_do tables
-- This migration ensures these tables are multi-tenant ready

-- Add wedding_id to registries table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registries') THEN
        -- Add column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'registries' 
            AND column_name = 'wedding_id'
        ) THEN
            ALTER TABLE public.registries
                ADD COLUMN wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;
            
            -- Create index
            CREATE INDEX IF NOT EXISTS idx_registries_wedding_id ON public.registries(wedding_id);
            
            -- Add RLS policy for public read access
            ALTER TABLE public.registries ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY IF NOT EXISTS "Allow public read access to registries" ON public.registries
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.weddings
                        WHERE weddings.id = registries.wedding_id
                        AND weddings.status = 'active'
                    )
                );
            
            CREATE POLICY IF NOT EXISTS "Allow wedding owners to manage registries" ON public.registries
                FOR ALL USING (
                    EXISTS (
                        SELECT 1 FROM public.weddings
                        WHERE weddings.id = registries.wedding_id
                        AND weddings.owner_id = auth.uid()
                    )
                );
        END IF;
    END IF;
END $$;

-- Add wedding_id to things_to_do table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'things_to_do') THEN
        -- Add column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'things_to_do' 
            AND column_name = 'wedding_id'
        ) THEN
            ALTER TABLE public.things_to_do
                ADD COLUMN wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;
            
            -- Create index
            CREATE INDEX IF NOT EXISTS idx_things_to_do_wedding_id ON public.things_to_do(wedding_id);
            
            -- Add RLS policy for public read access
            ALTER TABLE public.things_to_do ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY IF NOT EXISTS "Allow public read access to things_to_do" ON public.things_to_do
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.weddings
                        WHERE weddings.id = things_to_do.wedding_id
                        AND weddings.status = 'active'
                    )
                );
            
            CREATE POLICY IF NOT EXISTS "Allow wedding owners to manage things_to_do" ON public.things_to_do
                FOR ALL USING (
                    EXISTS (
                        SELECT 1 FROM public.weddings
                        WHERE weddings.id = things_to_do.wedding_id
                        AND weddings.owner_id = auth.uid()
                    )
                );
        END IF;
    END IF;
END $$;

