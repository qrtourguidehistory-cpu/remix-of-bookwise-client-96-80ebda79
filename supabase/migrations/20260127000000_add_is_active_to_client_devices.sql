-- Agregar columna is_active a client_devices para controlar el estado de las notificaciones
-- Esta columna permite "apagar" las notificaciones sin borrar el token cuando el usuario cierra sesión

-- Primero, asegurar que la columna role existe (necesaria para el índice compuesto)
ALTER TABLE public.client_devices
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('client', 'partner'));

-- Actualizar registros existentes sin role (determinar role desde el usuario)
DO $$
DECLARE
  rec RECORD;
  v_role TEXT;
BEGIN
  -- Para cada dispositivo sin role, intentar determinar el role del usuario
  FOR rec IN 
    SELECT DISTINCT cd.id, cd.user_id
    FROM public.client_devices cd
    WHERE cd.role IS NULL OR cd.role = ''
  LOOP
    -- Intentar determinar role desde la tabla profiles o appointments
    SELECT 
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.appointments a 
          WHERE a.owner_id = rec.user_id
        ) THEN 'partner'
        ELSE 'client'
      END INTO v_role;
    
    -- Si no se pudo determinar, usar 'client' por defecto
    IF v_role IS NULL THEN
      v_role := 'client';
    END IF;
    
    -- Actualizar el dispositivo
    UPDATE public.client_devices
    SET role = v_role
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Agregar columna is_active con valor por defecto true
ALTER TABLE public.client_devices
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Crear índice para mejorar el rendimiento de las consultas que filtran por is_active
CREATE INDEX IF NOT EXISTS idx_client_devices_is_active 
ON public.client_devices(is_active) 
WHERE is_active = true;

-- Crear índice compuesto para optimizar la consulta de la Edge Function
-- (filtra por user_id, role e is_active)
CREATE INDEX IF NOT EXISTS idx_client_devices_user_role_active 
ON public.client_devices(user_id, role, is_active) 
WHERE is_active = true;

-- Crear índice para role si no existe
CREATE INDEX IF NOT EXISTS idx_client_devices_role 
ON public.client_devices(role);

-- Comentarios
COMMENT ON COLUMN public.client_devices.is_active IS 
'Indica si el dispositivo está activo para recibir notificaciones push. Se establece en false al cerrar sesión y en true al iniciar sesión.';

COMMENT ON COLUMN public.client_devices.role IS 
'Rol del usuario propietario del dispositivo: "client" o "partner". Se usa para determinar qué secret de Firebase usar al enviar notificaciones push.';

