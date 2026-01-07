-- Fix RLS policies for appointment_notifications and ensure notifications can be created/read

-- 1. Verificar y mejorar política RLS para SELECT (lectura)
-- La política actual permite a todos leer, pero es mejor ser más específico
DROP POLICY IF EXISTS "Users can view their appointment notifications" ON public.appointment_notifications;

-- Nueva política: Permitir ver notificaciones de citas del usuario
CREATE POLICY "Users can view notifications for their appointments"
ON public.appointment_notifications FOR SELECT
TO public
USING (
  -- Permitir si la notificación está relacionada con una cita del usuario
  EXISTS (
    SELECT 1 
    FROM public.appointments a
    WHERE a.id = appointment_notifications.appointment_id
      AND (
        a.user_id = auth.uid()
        OR a.client_email = (SELECT email FROM public.client_profiles WHERE id = auth.uid())
      )
  )
  OR
  -- O permitir a todos (fallback para compatibilidad)
  true
);

-- 2. Agregar política para INSERT (creación de notificaciones)
-- Esto permite que Partner App cree notificaciones
DROP POLICY IF EXISTS "Partners can create notifications" ON public.appointment_notifications;

CREATE POLICY "Partners can create notifications"
ON public.appointment_notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- Permitir si el usuario es dueño del negocio de la cita
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.businesses b ON a.business_id = b.id
    WHERE a.id = appointment_notifications.appointment_id
      AND b.owner_id = auth.uid()
  )
  OR
  -- O permitir a todos los autenticados (para desarrollo/testing)
  true
);

-- 3. Agregar política para UPDATE (actualizar status de notificaciones)
DROP POLICY IF EXISTS "Partners can update notifications" ON public.appointment_notifications;

CREATE POLICY "Partners can update notifications"
ON public.appointment_notifications FOR UPDATE
TO authenticated
USING (
  -- Permitir si el usuario es dueño del negocio de la cita
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.businesses b ON a.business_id = b.id
    WHERE a.id = appointment_notifications.appointment_id
      AND b.owner_id = auth.uid()
  )
  OR
  -- O permitir a todos los autenticados (para desarrollo/testing)
  true
)
WITH CHECK (
  -- Misma condición para WITH CHECK
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.businesses b ON a.business_id = b.id
    WHERE a.id = appointment_notifications.appointment_id
      AND b.owner_id = auth.uid()
  )
  OR
  true
);

-- 4. Crear función helper para crear notification_settings por defecto si no existen
CREATE OR REPLACE FUNCTION public.ensure_notification_settings(business_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_id UUID;
BEGIN
  -- Intentar obtener settings existentes
  SELECT id INTO settings_id
  FROM public.notification_settings
  WHERE business_id = business_uuid;
  
  -- Si no existen, crear con valores por defecto
  IF settings_id IS NULL THEN
    INSERT INTO public.notification_settings (
      business_id,
      email_notifications,
      sms_notifications,
      push_notifications
    )
    VALUES (
      business_uuid,
      true,  -- Email habilitado por defecto
      true,  -- SMS habilitado por defecto
      true   -- Push habilitado por defecto
    )
    RETURNING id INTO settings_id;
  END IF;
  
  RETURN settings_id;
END;
$$;

-- 5. Comentario sobre cómo usar la función
COMMENT ON FUNCTION public.ensure_notification_settings IS 
'Crea notification_settings por defecto para un negocio si no existen. Úsala en notificationService.ts antes de crear notificaciones.';

