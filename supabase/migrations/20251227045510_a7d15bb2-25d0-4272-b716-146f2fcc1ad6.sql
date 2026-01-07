-- =====================================================
-- FASE 1: SEGURIDAD (CORREGIDA v3)
-- =====================================================

-- Drop policy primero, luego función, luego recrear
DROP POLICY IF EXISTS "Partners can view client profiles from their appointments" ON public.client_profiles;

DROP FUNCTION IF EXISTS public.is_partner_viewing_client_profile_from_appointments(uuid);

CREATE OR REPLACE FUNCTION public.is_partner_viewing_client_profile_from_appointments(client_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.businesses b ON a.business_id = b.id
    WHERE a.user_id = client_profile_id
      AND b.owner_id = auth.uid()
  );
$$;

-- Recrear la política
CREATE POLICY "Partners can view client profiles from their appointments"
ON public.client_profiles
FOR SELECT
USING ((id = auth.uid()) OR is_partner_viewing_client_profile_from_appointments(id));