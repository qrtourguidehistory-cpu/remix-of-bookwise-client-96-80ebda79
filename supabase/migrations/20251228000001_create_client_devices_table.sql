-- Crear tabla client_devices para almacenar tokens FCM de dispositivos de clientes
-- Esta tabla permite que las Edge Functions envíen push notifications FCM a los dispositivos

CREATE TABLE IF NOT EXISTS public.client_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android',
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Constraint único: un usuario puede tener múltiples dispositivos, pero cada token debe ser único por usuario
  CONSTRAINT client_devices_user_token_unique UNIQUE (user_id, fcm_token)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_client_devices_user_id ON public.client_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_client_devices_fcm_token ON public.client_devices(fcm_token);
CREATE INDEX IF NOT EXISTS idx_client_devices_platform ON public.client_devices(platform);

-- Habilitar RLS
ALTER TABLE public.client_devices ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Los usuarios solo pueden ver/insertar/actualizar sus propios dispositivos
CREATE POLICY "Users can view own devices"
ON public.client_devices
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
ON public.client_devices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
ON public.client_devices
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
ON public.client_devices
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_client_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_client_devices_updated_at
BEFORE UPDATE ON public.client_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_client_devices_updated_at();

-- Comentarios
COMMENT ON TABLE public.client_devices IS 
'Tabla para almacenar tokens FCM de dispositivos de clientes. Permite enviar push notifications a los dispositivos registrados.';

COMMENT ON COLUMN public.client_devices.user_id IS 
'ID del usuario propietario del dispositivo (referencia a auth.users)';

COMMENT ON COLUMN public.client_devices.fcm_token IS 
'Token FCM del dispositivo para recibir push notifications';

COMMENT ON COLUMN public.client_devices.platform IS 
'Plataforma del dispositivo (android, ios, web)';

COMMENT ON COLUMN public.client_devices.device_info IS 
'Información adicional del dispositivo en formato JSON';

