-- Agregar envío de FCM push notifications para notificaciones de cliente
-- Este migration modifica los triggers para que además de crear appointment_notifications,
-- también creen client_notifications y envíen push notifications vía FCM

-- 1. Habilitar extensión pg_net para hacer llamadas HTTP desde PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Función helper para enviar FCM push notification
-- Esta función llama a la Edge Function send-fcm-notification usando pg_net
CREATE OR REPLACE FUNCTION public.send_fcm_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
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
BEGIN
  -- Obtener URL de Supabase desde configuración o usar valor por defecto
  -- En producción, configura esto con: ALTER DATABASE postgres SET app.settings.supabase_url = 'https://tu-proyecto.supabase.co';
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
  END;
  
  -- Si no está configurada, usar valor por defecto del proyecto
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://rdznelijpliklisnflfm.supabase.co';
  END IF;
  
  -- Construir URL de la Edge Function
  -- La Edge Function tiene verify_jwt = false, por lo que no requiere autenticación JWT
  v_function_url := v_supabase_url || '/functions/v1/send-fcm-notification';
  
  -- Llamar a la Edge Function usando pg_net de forma asíncrona
  -- pg_net.http_post retorna un job_id que puede ser usado para verificar el estado
  -- Nota: La Edge Function no requiere autenticación (verify_jwt = false)
  BEGIN
    SELECT net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_id', p_user_id::text,
        'user_type', 'client',
        'title', p_title,
        'body', p_body,
        'data', COALESCE(p_data, '{}'::jsonb)
      )
    ) INTO v_response_id;
    
    -- Log para debugging
    RAISE NOTICE '[FCM] Push notification queued for user % (job_id: %): % - %', 
      p_user_id, v_response_id, p_title, p_body;
      
  EXCEPTION WHEN OTHERS THEN
    -- No fallar la transacción si pg_net falla
    RAISE WARNING '[FCM] Failed to queue FCM notification for user %: %', p_user_id, SQLERRM;
  END;
  
EXCEPTION WHEN OTHERS THEN
  -- No fallar la transacción si FCM falla
  RAISE WARNING '[FCM] Error in send_fcm_notification for user %: %', p_user_id, SQLERRM;
END;
$$;

-- 3. Función helper para obtener user_id del cliente desde una cita
CREATE OR REPLACE FUNCTION public.get_client_user_id_from_appointment(p_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
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
  
  -- Si no hay user_id pero hay client_email, buscar por email en client_profiles
  IF v_user_id IS NULL THEN
    SELECT client_email INTO v_client_email
    FROM public.appointments
    WHERE id = p_appointment_id;
    
    IF v_client_email IS NOT NULL THEN
      SELECT id INTO v_user_id
      FROM public.client_profiles
      WHERE email = v_client_email
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- 4. Modificar función create_appointment_status_notification para:
--    - Crear client_notification
--    - Enviar FCM push
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
            send_at,
            status,
            meta
          ) VALUES (
            NEW.id,
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
              'appointment_time', _appointment_time::text
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to create appointment_notification for appointment %: %', NEW.id, SQLERRM;
        END;
        
        -- Create notification in client_notifications if we have a user_id
        IF _client_user_id IS NOT NULL THEN
          BEGIN
            INSERT INTO public.client_notifications (
              user_id,
              appointment_id,
              business_id,
              type,
              title,
              message,
              read,
              meta
            ) VALUES (
              _client_user_id,
              NEW.id,
              _business_id,
              _notification_type,
              _notification_title,
              _notification_message,
              false,
              jsonb_build_object(
                'type', _notification_type,
                'business_id', _business_id,
                'business_name', _business_name,
                'appointment_date', _appointment_date::text,
                'appointment_time', _appointment_time::text
              )
            ) RETURNING id INTO _client_notification_id;
            
            -- Enviar FCM push notification
            -- Solo enviar si tenemos user_id válido
            BEGIN
              PERFORM public.send_fcm_notification(
                p_user_id := _client_user_id,
                p_title := _notification_title,
                p_body := _notification_message,
                p_data := jsonb_build_object(
                  'type', _notification_type,
                  'appointment_id', NEW.id::text,
                  'business_id', _business_id::text,
                  'notification_id', _client_notification_id::text
                )
              );
              
              RAISE NOTICE 'FCM push notification sent for user % (appointment %, type %)', 
                _client_user_id, NEW.id, _notification_type;
            EXCEPTION WHEN OTHERS THEN
              -- No fallar si FCM falla, solo loguear
              RAISE WARNING 'Failed to send FCM notification for user %: %', _client_user_id, SQLERRM;
            END;
            
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create client_notification for appointment %: %', NEW.id, SQLERRM;
          END;
        ELSE
          RAISE NOTICE 'No user_id found for appointment %, skipping client_notification and FCM', NEW.id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Modificar función create_review_request_notification para:
--    - Crear client_notification
--    - Enviar FCM push
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
            send_at,
            status,
            meta
          ) VALUES (
            _appointment_id,
            NOW(),
            'sent',
            jsonb_build_object(
              'type', 'review_request',
              'title', _notification_title,
              'message', _notification_message,
              'business_id', _business_id,
              'business_name', _business_name,
              'client_name', _client_name,
              'recipient_type', 'client'
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to create appointment_notification for review request: %', SQLERRM;
        END;
        
        -- Create notification in client_notifications if we have a user_id
        IF _client_user_id IS NOT NULL THEN
          BEGIN
            INSERT INTO public.client_notifications (
              user_id,
              appointment_id,
              business_id,
              type,
              title,
              message,
              read,
              meta
            ) VALUES (
              _client_user_id,
              _appointment_id,
              _business_id,
              'review_request',
              _notification_title,
              _notification_message,
              false,
              jsonb_build_object(
                'type', 'review_request',
                'business_id', _business_id,
                'business_name', _business_name
              )
            ) RETURNING id INTO _client_notification_id;
            
            -- Enviar FCM push notification
            BEGIN
              PERFORM public.send_fcm_notification(
                p_user_id := _client_user_id,
                p_title := _notification_title,
                p_body := _notification_message,
                p_data := jsonb_build_object(
                  'type', 'review_request',
                  'appointment_id', _appointment_id::text,
                  'business_id', _business_id::text,
                  'notification_id', _client_notification_id::text
                )
              );
              
              RAISE NOTICE 'FCM push notification sent for review request (user %, appointment %)', 
                _client_user_id, _appointment_id;
            EXCEPTION WHEN OTHERS THEN
              RAISE WARNING 'Failed to send FCM notification for review request: %', SQLERRM;
            END;
            
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create client_notification for review request: %', SQLERRM;
          END;
        ELSE
          RAISE NOTICE 'No user_id found for appointment %, skipping client_notification and FCM for review request', _appointment_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Comentarios explicativos
COMMENT ON FUNCTION public.send_fcm_notification IS 
'Envía una notificación push FCM al cliente. Llama a la Edge Function send-fcm-notification de forma asíncrona.';

COMMENT ON FUNCTION public.get_client_user_id_from_appointment IS 
'Obtiene el user_id del cliente desde una cita, buscando primero en user_id y luego por client_email en client_profiles.';

COMMENT ON FUNCTION public.create_appointment_status_notification IS 
'Crea notificaciones cuando cambia el estado de una cita. Ahora también crea client_notifications y envía push FCM.';

COMMENT ON FUNCTION public.create_review_request_notification IS 
'Crea notificación de solicitud de reseña cuando una cita se completa. Ahora también crea client_notifications y envía push FCM.';

