-- =====================================================
-- SCRIPT MAESTRO: CONFIGURACIÓN COMPLETA DE NOTIFICACIONES PUSH
-- =====================================================
-- Este script:
-- 1. Elimina todos los triggers y funciones antiguas relacionadas con notificaciones
-- 2. Asegura que las tablas tengan las columnas necesarias (incluyendo role)
-- 3. Crea nuevos triggers que llamen a send-push-notification con role automático
-- 4. Configura todo para que las notificaciones funcionen automáticamente
-- =====================================================

-- =====================================================
-- FASE 1: ELIMINAR TRIGGERS Y FUNCIONES ANTIGUAS
-- =====================================================

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_create_appointment_status_notification ON public.appointments;
DROP TRIGGER IF EXISTS trigger_create_review_request_notification ON public.appointments;
DROP TRIGGER IF EXISTS trigger_send_push_on_client_notification ON public.client_notifications;
DROP TRIGGER IF EXISTS trigger_send_push_on_appointment_notification ON public.appointment_notifications;

-- Eliminar funciones existentes relacionadas con notificaciones
DROP FUNCTION IF EXISTS public.create_appointment_status_notification();
DROP FUNCTION IF EXISTS public.create_review_request_notification();
DROP FUNCTION IF EXISTS public.send_fcm_notification(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_client_user_id_from_appointment(UUID);
DROP FUNCTION IF EXISTS public.send_push_notification_trigger();
DROP FUNCTION IF EXISTS public.send_push_on_client_notification();
DROP FUNCTION IF EXISTS public.send_push_on_appointment_notification();

-- =====================================================
-- FASE 2: HABILITAR EXTENSIÓN pg_net (si no existe)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- FASE 3: CONFIGURAR SUPABASE URL Y SERVICE ROLE KEY
-- =====================================================
-- IMPORTANTE: Configura estos valores con tu información real
-- Puedes obtener el SERVICE_ROLE_KEY desde: Supabase Dashboard → Settings → API → service_role key (secret)

-- Configurar Supabase URL como variable de configuración
DO $$
BEGIN
  -- Intentar obtener la URL desde configuración existente
  PERFORM current_setting('app.settings.supabase_url', true);
EXCEPTION WHEN OTHERS THEN
  -- Si no existe, crearla
  ALTER DATABASE postgres SET app.settings.supabase_url = 'https://rdznelijpliklisnflfm.supabase.co';
END $$;

-- Configurar Service Role Key como variable (debes actualizar esto con tu key real)
-- Obtén tu SERVICE_ROLE_KEY desde: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api
-- Luego ejecuta: ALTER DATABASE postgres SET app.settings.service_role_key = 'TU_SERVICE_ROLE_KEY_AQUI';
-- Por ahora, lo obtendremos de una función que intenta obtenerla desde configuración o usar un valor por defecto

-- =====================================================
-- FASE 4: SINCRONIZAR TABLA client_notifications
-- =====================================================

-- Asegurar que client_notifications tenga todas las columnas necesarias
ALTER TABLE IF EXISTS public.client_notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'appointment',
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'partner'));

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_client_notifications_user_id ON public.client_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_role ON public.client_notifications(role);
CREATE INDEX IF NOT EXISTS idx_client_notifications_type ON public.client_notifications(type);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON public.client_notifications(created_at DESC);

-- Hacer que role sea NOT NULL (si hay registros antiguos, actualizarlos primero)
DO $$
BEGIN
  -- Actualizar registros existentes sin role
  UPDATE public.client_notifications
  SET role = 'client'
  WHERE role IS NULL OR role = '';
  
  -- Ahora hacer la columna NOT NULL
  ALTER TABLE public.client_notifications
    ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN role SET DEFAULT 'client';
EXCEPTION WHEN OTHERS THEN
  -- Si falla, continuar
  RAISE NOTICE 'Error al actualizar client_notifications.role: %', SQLERRM;
END $$;

-- =====================================================
-- FASE 5: SINCRONIZAR TABLA appointment_notifications
-- =====================================================

-- Asegurar que appointment_notifications tenga todas las columnas necesarias
-- appointment_notifications usa meta (JSONB) para almacenar título y mensaje
-- Pero también agregamos columnas directas si no existen
ALTER TABLE IF EXISTS public.appointment_notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('client', 'partner'));

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_user_id ON public.appointment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_role ON public.appointment_notifications(role);
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_appointment_id ON public.appointment_notifications(appointment_id);

-- Actualizar registros existentes sin role (intentar determinar role desde appointment)
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Actualizar role en appointment_notifications basándose en la relación con appointments
  FOR rec IN 
    SELECT an.id, a.user_id, a.business_id, b.owner_id
    FROM public.appointment_notifications an
    JOIN public.appointments a ON an.appointment_id = a.id
    LEFT JOIN public.businesses b ON a.business_id = b.id
    WHERE an.role IS NULL
  LOOP
    -- Si hay user_id en appointment, es un cliente
    IF rec.user_id IS NOT NULL THEN
      UPDATE public.appointment_notifications
      SET role = 'client', user_id = rec.user_id
      WHERE id = rec.id;
    -- Si no hay user_id pero hay business, podría ser para el dueño
    ELSIF rec.business_id IS NOT NULL AND rec.owner_id IS NOT NULL THEN
      UPDATE public.appointment_notifications
      SET role = 'partner', user_id = rec.owner_id
      WHERE id = rec.id;
    ELSE
      -- Default a client
      UPDATE public.appointment_notifications
      SET role = 'client'
      WHERE id = rec.id;
    END IF;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error al actualizar appointment_notifications.role: %', SQLERRM;
END $$;

-- =====================================================
-- FASE 6: FUNCIÓN HELPER PARA OBTENER SERVICE ROLE KEY
-- =====================================================

-- Función para obtener Service Role Key desde configuración
-- IMPORTANTE: Debes configurar esto ejecutando:
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'TU_SERVICE_ROLE_KEY_AQUI';
-- Obtén tu key desde: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api

CREATE OR REPLACE FUNCTION public.get_service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  BEGIN
    v_key := current_setting('app.settings.service_role_key', true);
    IF v_key IS NULL OR v_key = '' THEN
      RAISE EXCEPTION 'Service Role Key no está configurada. Ejecuta: ALTER DATABASE postgres SET app.settings.service_role_key = ''TU_KEY'';';
    END IF;
    RETURN v_key;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error obteniendo Service Role Key: %. Configura con: ALTER DATABASE postgres SET app.settings.service_role_key = ''TU_KEY'';', SQLERRM;
  END;
END;
$$;

-- =====================================================
-- FASE 7: FUNCIÓN PARA LLAMAR A send-push-notification
-- =====================================================

-- Función que llama a la Edge Function send-push-notification
-- Esta función determina automáticamente el role y usa el secret correcto

CREATE OR REPLACE FUNCTION public.call_send_push_notification(
  p_user_id UUID,
  p_role TEXT,  -- 'client' o 'partner'
  p_title TEXT,
  p_body TEXT,
  p_notification_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_function_url TEXT;
  v_response_id BIGINT;
  v_request_body JSONB;
  v_normalized_role TEXT;
BEGIN
  -- CRÍTICO: Validar que user_id NO sea NULL
  IF p_user_id IS NULL THEN
    RAISE WARNING '[Push] call_send_push_notification: user_id es NULL, no se puede enviar push. role=%, title=%', 
      p_role, p_title;
    RETURN;
  END IF;
  
  -- CRÍTICO: Normalizar role a minúsculas
  v_normalized_role := LOWER(TRIM(COALESCE(p_role, 'client')));
  
  -- Validar que title y body no sean NULL o vacíos
  IF p_title IS NULL OR p_title = '' OR p_body IS NULL OR p_body = '' THEN
    RAISE WARNING '[Push] call_send_push_notification: title o body vacíos. user_id=%, title=%, body=%, role=%', 
      p_user_id, p_title, p_body, v_normalized_role;
    RETURN;
  END IF;
  
  -- CRÍTICO: Obtener Supabase URL - SIEMPRE tener un valor por defecto
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    -- Si es NULL o vacío, usar el valor por defecto
    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      v_supabase_url := 'https://rdznelijpliklisnflfm.supabase.co';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Si falla, usar valor por defecto
    v_supabase_url := 'https://rdznelijpliklisnflfm.supabase.co';
  END;
  
  -- CRÍTICO: Construir URL de la Edge Function - Asegurar que nunca sea NULL
  v_function_url := TRIM(v_supabase_url) || '/functions/v1/send-push-notification';
  
  -- CRÍTICO: Validar que la URL esté completa y no sea NULL
  IF v_function_url IS NULL OR v_function_url = '' OR NOT (v_function_url LIKE 'http%') THEN
    RAISE WARNING '[Push] ERROR CRÍTICO: URL de Edge Function inválida. v_supabase_url=%, v_function_url=%', 
      v_supabase_url, v_function_url;
    RETURN;
  END IF;
  
  -- Obtener Service Role Key
  BEGIN
    v_service_role_key := public.get_service_role_key();
    IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
      RAISE WARNING '[Push] ERROR CRÍTICO: Service Role Key es NULL o vacío';
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Push] ERROR al obtener Service Role Key: %', SQLERRM;
    RETURN;
  END;
  
  -- Construir body del request - usar role normalizado
  v_request_body := jsonb_build_object(
    'user_id', p_user_id::text,
    'title', p_title,
    'body', p_body,
    'role', v_normalized_role,  -- CRÍTICO: Usar role normalizado
    'data', COALESCE(p_data, '{}'::jsonb),
    'notification_id', CASE WHEN p_notification_id IS NOT NULL THEN p_notification_id::text ELSE NULL END
  );
  
  -- Log ANTES de llamar a pg_net
  RAISE NOTICE '[Push] === INICIANDO LLAMADA A EDGE FUNCTION ===';
  RAISE NOTICE '[Push] URL: %', v_function_url;
  RAISE NOTICE '[Push] user_id: %, role: % (normalizado de %)', p_user_id, v_normalized_role, p_role;
  
  -- CRÍTICO: Validar nuevamente que la URL no sea NULL antes de llamar
  IF v_function_url IS NULL OR v_function_url = '' THEN
    RAISE WARNING '[Push] ERROR CRÍTICO: URL es NULL antes de llamar a pg_net.http_post';
    RETURN;
  END IF;
  
  -- Llamar a la Edge Function usando pg_net
  BEGIN
    SELECT net.http_post(
      url := v_function_url,  -- CRÍTICO: Esta URL debe ser válida
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := v_request_body,
      timeout_milliseconds := 30000
    ) INTO v_response_id;
    
    -- Log después de la llamada
    RAISE NOTICE '[Push] === LLAMADA A pg_net.http_post COMPLETADA ===';
    RAISE NOTICE '[Push] Response ID (job_id): %', v_response_id;
    RAISE NOTICE '[Push] Notificación push ENCOLADA para usuario % (role: %), job_id: %', 
      p_user_id, v_normalized_role, v_response_id;
      
    -- Verificar el resultado
    IF v_response_id IS NULL OR v_response_id = 0 THEN
      RAISE WARNING '[Push] ADVERTENCIA: pg_net.http_post retornó NULL o 0.';
    END IF;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Push] === ERROR EN pg_net.http_post ===';
    RAISE WARNING '[Push] Error: %, SQLSTATE: %', SQLERRM, SQLSTATE;
    RAISE WARNING '[Push] URL intentada: %', COALESCE(v_function_url, 'NULL');
  END;
  
EXCEPTION WHEN OTHERS THEN
  -- No fallar la transacción si falla
  RAISE WARNING '[Push] Error en call_send_push_notification para usuario %: %', p_user_id, SQLERRM;
END;
$$;

-- =====================================================
-- FASE 8: FUNCIÓN PARA DETERMINAR ROLE AUTOMÁTICAMENTE
-- =====================================================

-- Función helper para determinar si un user_id es client o partner
CREATE OR REPLACE FUNCTION public.determine_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Primero verificar si es partner (tiene un negocio)
  IF EXISTS (
    SELECT 1 
    FROM public.businesses b
    WHERE b.owner_id = p_user_id
  ) THEN
    RETURN 'partner';
  END IF;
  
  -- Si no es partner, es client por defecto
  RETURN 'client';
END;
$$;

-- Función helper para obtener user_id del cliente desde un appointment
CREATE OR REPLACE FUNCTION public.get_client_user_id_from_appointment(p_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_client_email TEXT;
BEGIN
  -- Intentar obtener user_id directamente de la cita
  SELECT user_id INTO v_user_id
  FROM public.appointments
  WHERE id = p_appointment_id;
  
  -- Si no hay user_id pero hay client_email, buscar por email
  IF v_user_id IS NULL THEN
    SELECT client_email INTO v_client_email
    FROM public.appointments
    WHERE id = p_appointment_id;
    
    IF v_client_email IS NOT NULL THEN
      -- Primero intentar buscar en client_profiles (tabla específica de clientes)
      SELECT id INTO v_user_id
      FROM public.client_profiles
      WHERE email = v_client_email
      LIMIT 1;
      
      -- Si no se encuentra en client_profiles, buscar directamente en auth.users
      IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_client_email
        LIMIT 1;
      END IF;
    END IF;
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- Función helper para obtener user_id del partner (dueño del negocio) desde un appointment
CREATE OR REPLACE FUNCTION public.get_partner_user_id_from_appointment(p_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Obtener owner_id del negocio asociado a la cita
  SELECT b.owner_id INTO v_owner_id
  FROM public.appointments a
  JOIN public.businesses b ON a.business_id = b.id
  WHERE a.id = p_appointment_id
  LIMIT 1;
  
  RETURN v_owner_id;
END;
$$;

-- =====================================================
-- FASE 9: TRIGGER PARA client_notifications
-- =====================================================

-- Trigger que envía push notification cuando se crea un registro en client_notifications
CREATE OR REPLACE FUNCTION public.send_push_on_client_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_data JSONB;
BEGIN
  -- Solo enviar si tenemos user_id, title y message
  IF NEW.user_id IS NULL OR NEW.title IS NULL OR NEW.message IS NULL THEN
    RAISE NOTICE '[Push] Skipping push notification: falta user_id, title o message';
    RETURN NEW;
  END IF;
  
  -- Determinar role automáticamente si no está especificado
  IF NEW.role IS NULL OR NEW.role = '' THEN
    v_user_role := public.determine_user_role(NEW.user_id);
  ELSE
    v_user_role := NEW.role;
  END IF;
  
  -- Construir data object con información adicional
  v_data := jsonb_build_object(
    'type', COALESCE(NEW.type, 'appointment'),
    'notification_id', NEW.id::text
  );
  
  -- Agregar campos adicionales si existen
  IF NEW.appointment_id IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('appointment_id', NEW.appointment_id::text);
  END IF;
  
  IF NEW.business_id IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('business_id', NEW.business_id::text);
  END IF;
  
  IF NEW.meta IS NOT NULL AND jsonb_typeof(NEW.meta) = 'object' THEN
    v_data := v_data || NEW.meta;
  END IF;
  
  -- Llamar a la función que envía el push
  PERFORM public.call_send_push_notification(
    p_user_id := NEW.user_id,
    p_role := v_user_role,
    p_title := NEW.title,
    p_body := NEW.message,
    p_notification_id := NEW.id,
    p_data := v_data
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- No fallar si el push falla
  RAISE WARNING '[Push] Error en send_push_on_client_notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Crear el trigger
CREATE TRIGGER trigger_send_push_on_client_notification
AFTER INSERT ON public.client_notifications
FOR EACH ROW
WHEN (NEW.user_id IS NOT NULL AND NEW.title IS NOT NULL AND NEW.message IS NOT NULL)
EXECUTE FUNCTION public.send_push_on_client_notification();

-- =====================================================
-- FASE 10: TRIGGER PARA appointment_notifications
-- =====================================================

-- Trigger que envía push notification cuando se crea un registro en appointment_notifications
CREATE OR REPLACE FUNCTION public.send_push_on_appointment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_data JSONB;
  v_recipient_type TEXT;
BEGIN
  -- Extraer título y mensaje del meta (JSONB)
  v_title := COALESCE(NEW.meta->>'title', 'Nueva notificación');
  v_message := COALESCE(NEW.meta->>'message', 'Tienes una nueva notificación');
  v_type := COALESCE(NEW.meta->>'type', 'appointment');
  v_recipient_type := COALESCE(NEW.meta->>'recipient_type', 'client');
  
  -- Determinar user_id y role según recipient_type
  IF v_recipient_type = 'partner' OR v_recipient_type = 'business_owner' THEN
    -- Notificación para el dueño del negocio
    v_user_id := public.get_partner_user_id_from_appointment(NEW.appointment_id);
    v_user_role := 'partner';
  ELSE
    -- Notificación para el cliente (default)
    v_user_id := COALESCE(NEW.user_id, public.get_client_user_id_from_appointment(NEW.appointment_id));
    v_user_role := 'client';
  END IF;
  
  -- Si no hay user_id, no podemos enviar push
  IF v_user_id IS NULL THEN
    RAISE NOTICE '[Push] Skipping push notification: no user_id found para appointment_notification %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Actualizar user_id y role en appointment_notifications si no están
  IF NEW.user_id IS NULL THEN
    UPDATE public.appointment_notifications
    SET user_id = v_user_id, role = v_user_role
    WHERE id = NEW.id;
  ELSIF NEW.role IS NULL OR NEW.role = '' THEN
    UPDATE public.appointment_notifications
    SET role = v_user_role
    WHERE id = NEW.id;
  END IF;
  
  -- Construir data object
  v_data := jsonb_build_object(
    'type', v_type,
    'notification_id', NEW.id::text
  );
  
  -- Agregar campos del meta si existen
  IF NEW.meta IS NOT NULL AND jsonb_typeof(NEW.meta) = 'object' THEN
    v_data := v_data || NEW.meta;
  END IF;
  
  -- Llamar a la función que envía el push
  PERFORM public.call_send_push_notification(
    p_user_id := v_user_id,
    p_role := v_user_role,
    p_title := v_title,
    p_body := v_message,
    p_notification_id := NEW.id,
    p_data := v_data
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- No fallar si el push falla
  RAISE WARNING '[Push] Error en send_push_on_appointment_notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Crear el trigger
CREATE TRIGGER trigger_send_push_on_appointment_notification
AFTER INSERT ON public.appointment_notifications
FOR EACH ROW
WHEN (NEW.appointment_id IS NOT NULL)
EXECUTE FUNCTION public.send_push_on_appointment_notification();

-- =====================================================
-- FASE 11: FUNCIONES PARA CREAR NOTIFICACIONES CON ROLE
-- =====================================================

-- Recrear función create_appointment_status_notification que crea client_notifications con role automático
CREATE OR REPLACE FUNCTION public.create_appointment_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id UUID;
  _business_name TEXT;
  _client_name TEXT;
  _client_user_id UUID;
  _notification_title TEXT;
  _notification_message TEXT;
  _notification_type TEXT;
  _appointment_date DATE;
  _appointment_time TIME;
  _client_notification_id UUID;
  _user_role TEXT;
BEGIN
  -- Only create notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get business information
    SELECT b.id, b.business_name INTO _business_id, _business_name
    FROM public.businesses b
    WHERE b.id = NEW.business_id;
    
    -- Get client information
    _client_name := COALESCE(NEW.client_name, 'Cliente');
    _appointment_date := NEW.date;
    _appointment_time := NEW.start_time;
    
    -- Get client user_id
    _client_user_id := public.get_client_user_id_from_appointment(NEW.id);
    
    -- Determine notification type and message based on new status
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
      _notification_type := 'confirmation';
      _notification_title := 'Cita confirmada';
      _notification_message := 'Tu cita en ' || COALESCE(_business_name, 'el establecimiento') || 
        ' ha sido confirmada para el ' || TO_CHAR(_appointment_date, 'DD/MM/YYYY') || 
        ' a las ' || TO_CHAR(_appointment_time, 'HH24:MI') || '.';
    
    ELSIF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
      _notification_type := 'completion';
      _notification_title := 'Cita completada';
      _notification_message := 'Tu cita en ' || COALESCE(_business_name, 'el establecimiento') || 
        ' ha sido completada. ¡Gracias por visitarnos!';
    
    ELSIF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
      _notification_type := 'cancellation';
      _notification_title := 'Cita cancelada';
      _notification_message := 'Tu cita en ' || COALESCE(_business_name, 'el establecimiento') || 
        ' para el ' || TO_CHAR(_appointment_date, 'DD/MM/YYYY') || 
        ' a las ' || TO_CHAR(_appointment_time, 'HH24:MI') || ' ha sido cancelada.';
    
    ELSIF NEW.status = 'no_show' AND (OLD.status IS NULL OR OLD.status != 'no_show') THEN
      _notification_type := 'no_show';
      _notification_title := 'Cita marcada como no asistida';
      _notification_message := 'Tu cita en ' || COALESCE(_business_name, 'el establecimiento') || 
        ' para el ' || TO_CHAR(_appointment_date, 'DD/MM/YYYY') || 
        ' a las ' || TO_CHAR(_appointment_time, 'HH24:MI') || ' ha sido marcada como no asistida.';
    
    ELSE
      -- Don't create notification for other status changes
      RETURN NEW;
    END IF;
    
    -- Only create notification if we have a valid appointment_id and business_id
    IF NEW.id IS NOT NULL AND _business_id IS NOT NULL THEN
      -- Check if a notification with the same appointment_id and type already exists (within last 10 minutes)
      IF NOT EXISTS (
        SELECT 1 
        FROM public.appointment_notifications 
        WHERE appointment_id = NEW.id 
          AND meta->>'type' = _notification_type
          AND send_at > NOW() - INTERVAL '10 minutes'
      ) THEN
        -- Create notification in appointment_notifications
        BEGIN
          INSERT INTO public.appointment_notifications (
            appointment_id,
            user_id,
            role,
            send_at,
            status,
            meta
          ) VALUES (
            NEW.id,
            _client_user_id,  -- CRÍTICO: Incluir user_id del cliente
            'client',  -- CRÍTICO: Incluir role para que el trigger sepa qué secret usar
            NOW(),
            'sent',
            jsonb_build_object(
              'type', _notification_type,
              'title', _notification_title,
              'message', _notification_message,
              'business_id', _business_id,
              'business_name', _business_name,
              'client_name', _client_name,
              'appointment_date', _appointment_date::text,
              'appointment_time', _appointment_time::text,
              'recipient_type', 'client',
              'user_id', _client_user_id::text  -- También incluir en meta para referencia
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to create appointment_notification for appointment %: %', NEW.id, SQLERRM;
        END;
        
        -- Create notification in client_notifications if we have a user_id
        IF _client_user_id IS NOT NULL THEN
          BEGIN
            -- Determinar role automáticamente
            _user_role := public.determine_user_role(_client_user_id);
            
            INSERT INTO public.client_notifications (
              user_id,
              appointment_id,
              business_id,
              type,
              title,
              message,
              role,  -- IMPORTANTE: Guardar role en la tabla
              read,
              meta
            ) VALUES (
              _client_user_id,
              NEW.id,
              _business_id,
              _notification_type,
              _notification_title,
              _notification_message,
              _user_role,  -- Role determinado automáticamente
              false,
              jsonb_build_object(
                'type', _notification_type,
                'business_id', _business_id,
                'business_name', _business_name,
                'appointment_date', _appointment_date::text,
                'appointment_time', _appointment_time::text
              )
            ) RETURNING id INTO _client_notification_id;
            
            -- El trigger send_push_on_client_notification enviará el push automáticamente
            
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create client_notification for appointment %: %', NEW.id, SQLERRM;
          END;
        ELSE
          RAISE NOTICE 'No user_id found for appointment %, skipping client_notification', NEW.id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para appointment status changes
CREATE TRIGGER trigger_create_appointment_status_notification
AFTER UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.create_appointment_status_notification();

-- =====================================================
-- FASE 12: FUNCIÓN PARA REVIEW REQUEST (actualizada)
-- =====================================================

-- Recrear función create_review_request_notification
CREATE OR REPLACE FUNCTION public.create_review_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id UUID;
  _business_name TEXT;
  _client_name TEXT;
  _client_user_id UUID;
  _appointment_id UUID;
  _notification_title TEXT;
  _notification_message TEXT;
  _client_notification_id UUID;
  _user_role TEXT;
BEGIN
  -- Only create notification when appointment status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    _appointment_id := NEW.id;
    _business_id := NEW.business_id;
    _client_name := COALESCE(NEW.client_name, 'Cliente');
    
    -- Get business name
    SELECT business_name INTO _business_name
    FROM public.businesses
    WHERE id = _business_id;
    
    -- Get client user_id
    _client_user_id := public.get_client_user_id_from_appointment(NEW.id);
    
    -- Check if a review already exists for this appointment
    IF NOT EXISTS (
      SELECT 1 
      FROM public.reviews 
      WHERE appointment_id = _appointment_id
        AND status IN ('pending', 'completed')
    ) THEN
      _notification_title := 'Solicitud de reseña';
      _notification_message := 'Tu cita en ' || COALESCE(_business_name, 'el establecimiento') || 
        ' ha sido completada. ¡Nos encantaría conocer tu opinión!';
      
      -- Check if a review_request notification already exists (within last 10 minutes)
      IF NOT EXISTS (
        SELECT 1 
        FROM public.appointment_notifications 
        WHERE appointment_id = _appointment_id 
          AND meta->>'type' = 'review_request'
          AND send_at > NOW() - INTERVAL '10 minutes'
      ) THEN
        -- Create review request notification in appointment_notifications
        BEGIN
          INSERT INTO public.appointment_notifications (
            appointment_id,
            user_id,
            role,
            send_at,
            status,
            meta
          ) VALUES (
            _appointment_id,
            _client_user_id,  -- CRÍTICO: Incluir user_id del cliente
            'client',  -- CRÍTICO: Incluir role para que el trigger sepa qué secret usar
            NOW(),
            'sent',
            jsonb_build_object(
              'type', 'review_request',
              'title', _notification_title,
              'message', _notification_message,
              'business_id', _business_id,
              'business_name', _business_name,
              'client_name', _client_name,
              'recipient_type', 'client',
              'user_id', _client_user_id::text  -- También incluir en meta para referencia
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to create appointment_notification for review request: %', SQLERRM;
        END;
        
        -- Create notification in client_notifications if we have a user_id
        IF _client_user_id IS NOT NULL THEN
          BEGIN
            -- Determinar role automáticamente
            _user_role := public.determine_user_role(_client_user_id);
            
            INSERT INTO public.client_notifications (
              user_id,
              appointment_id,
              business_id,
              type,
              title,
              message,
              role,  -- IMPORTANTE: Guardar role
              read,
              meta
            ) VALUES (
              _client_user_id,
              _appointment_id,
              _business_id,
              'review_request',
              _notification_title,
              _notification_message,
              _user_role,  -- Role determinado automáticamente
              false,
              jsonb_build_object(
                'type', 'review_request',
                'business_id', _business_id,
                'business_name', _business_name
              )
            ) RETURNING id INTO _client_notification_id;
            
            -- El trigger send_push_on_client_notification enviará el push automáticamente
            
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create client_notification for review request: %', SQLERRM;
          END;
        ELSE
          RAISE NOTICE 'No user_id found for appointment %, skipping client_notification and push for review request', _appointment_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para review request
CREATE TRIGGER trigger_create_review_request_notification
AFTER UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION public.create_review_request_notification();

-- =====================================================
-- FASE 13: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION public.get_service_role_key IS 
'Obtiene el Service Role Key desde la configuración de la base de datos. Debe configurarse con: ALTER DATABASE postgres SET app.settings.service_role_key = ''TU_KEY'';';

COMMENT ON FUNCTION public.call_send_push_notification IS 
'Llama a la Edge Function send-push-notification con el role correcto para usar el secret adecuado (FIREBASE_SERVICE_ACCOUNT_CLIENT o FIREBASE_SERVICE_ACCOUNT_PARTNER).';

COMMENT ON FUNCTION public.determine_user_role IS 
'Determina automáticamente si un user_id es client o partner basándose en si tiene un negocio.';

COMMENT ON FUNCTION public.send_push_on_client_notification IS 
'Trigger que envía push notification automáticamente cuando se crea un registro en client_notifications. Determina el role automáticamente.';

COMMENT ON FUNCTION public.send_push_on_appointment_notification IS 
'Trigger que envía push notification automáticamente cuando se crea un registro en appointment_notifications. Determina user_id y role basándose en recipient_type.';

COMMENT ON FUNCTION public.create_appointment_status_notification IS 
'Crea notificaciones cuando cambia el estado de una cita. Ahora también crea client_notifications con role automático y envía push vía trigger.';

COMMENT ON FUNCTION public.create_review_request_notification IS 
'Crea notificación de solicitud de reseña cuando una cita se completa. Ahora también crea client_notifications con role automático y envía push vía trigger.';

-- =====================================================
-- FASE 14: VERIFICACIONES FINALES
-- =====================================================

-- Verificar que las columnas existen
DO $$
BEGIN
  -- Verificar client_notifications
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'client_notifications' 
      AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'La columna role no existe en client_notifications';
  END IF;
  
  -- Verificar que los triggers existen
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_send_push_on_client_notification'
  ) THEN
    RAISE WARNING 'El trigger trigger_send_push_on_client_notification no fue creado';
  END IF;
  
  RAISE NOTICE '✅ Configuración de notificaciones push completada';
END $$;


