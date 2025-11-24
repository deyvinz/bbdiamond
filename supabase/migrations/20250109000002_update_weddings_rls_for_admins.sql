-- Migration: Allow admins/staff and service role to manage wedding settings

DROP POLICY IF EXISTS "Allow wedding owners to manage their weddings" ON public.weddings;

CREATE POLICY "Allow wedding owners and admins to manage their weddings"
  ON public.weddings FOR ALL
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.wedding_owners
      WHERE wedding_owners.wedding_id = weddings.id
        AND wedding_owners.customer_id = auth.uid()
    )
    OR public.user_has_admin_access_to_wedding(weddings.id)
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.wedding_owners
      WHERE wedding_owners.wedding_id = weddings.id
        AND wedding_owners.customer_id = auth.uid()
    )
    OR public.user_has_admin_access_to_wedding(weddings.id)
  );

