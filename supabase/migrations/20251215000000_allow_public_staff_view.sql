-- Permitir que los clientes vean staff de negocios públicos
-- Similar a la política que permite ver servicios de negocios públicos

-- Eliminar política existente si existe (para evitar duplicados)
DROP POLICY IF EXISTS "Anyone can view staff from public active businesses" ON public.staff;

-- Política para permitir ver staff de negocios públicos y activos
CREATE POLICY "Anyone can view staff from public active businesses"
ON public.staff FOR SELECT
TO public
USING (
  -- Permitir si el negocio es público y activo
  EXISTS (
    SELECT 1 
    FROM public.businesses b 
    WHERE b.id = staff.business_id 
      AND b.is_public = true 
      AND b.is_active = true
  )
  OR
  -- O si el usuario es dueño del negocio
  (business_id = get_user_business_id())
);

-- La política existente "Business owners can manage own staff" sigue permitiendo
-- que los dueños gestionen su staff (INSERT, UPDATE, DELETE) a través de FOR ALL
-- Las políticas en PostgreSQL se combinan con OR, así que esta nueva política
-- permite SELECT para clientes sin afectar las operaciones de los dueños

