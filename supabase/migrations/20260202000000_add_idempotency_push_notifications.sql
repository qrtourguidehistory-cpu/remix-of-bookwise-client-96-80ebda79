-- =====================================================
-- MIGRACIÓN: IDEMPOTENCIA EN PUSH NOTIFICATIONS
-- =====================================================
-- Objetivo: Garantizar que una cita solo dispare UNA notificación confirmada
-- Problema: notify-appointment-confirmed se ejecuta múltiples veces
-- Solución: Agregar verificación de idempotencia en triggers y Edge Functions

-- =====================================================
-- FASE 1: TABLA DE CONTROL DE NOTIFICACIONES ENVIADAS
-- =====================================================

-- Tabla para rastrear qué notificaciones push ya se enviaron
CREATE TABLE IF NOT EXISTS public.push_notification_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'confirmation', 'cancellation', 'completion', etc.
  edge_function TEXT NOT NULL, -- 'notify-appointment-confirmed', 'send-push-notification', etc.
  user_id UUID NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraint único: una cita solo puede tener UNA notificación de cada tipo enviada
  CONSTRAINT push_notification_sent_unique UNIQUE (appointment_id, notification_type, edge_function)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_push_notification_sent_appointment 
  ON public.push_notification_sent(appointment_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_push_notification_sent_user 
  ON public.push_notification_sent(user_id, sent_at);

CREATE INDEX IF NOT EXISTS idx_push_notification_sent_sent_at 
  ON public.push_notification_sent(sent_at);

-- Comentarios
COMMENT ON TABLE public.push_notification_sent IS 
'Tabla de control para garantizar idempotencia en push notifications. Rastrea qué notificaciones ya se enviaron para evitar duplicados.';

COMMENT ON COLUMN public.push_notification_sent.appointment_id IS 
'ID de la cita para la cual se envió la notificación';

COMMENT ON COLUMN public.push_notification_sent.notification_type IS 
'Tipo de notificación: confirmation, cancellation, completion, etc.';

COMMENT ON COLUMN public.push_notification_sent.edge_function IS 
'Nombre de la Edge Function que envió la notificación: notify-appointment-confirmed, send-push-notification, etc.';

-- =====================================================
-- FASE 2: FUNCIÓN HELPER PARA VERIFICAR IDEMPOTENCIA
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_push_notification_sent(
  p_appointment_id UUID,
  p_notification_type TEXT,
  p_edge_function TEXT,
  p_time_window_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_sent BOOLEAN;
BEGIN
  -- Verificar si ya se envió una notificación para esta cita y tipo en el período especificado
  SELECT EXISTS (
    SELECT 1
    FROM public.push_notification_sent
    WHERE appointment_id = p_appointment_id
      AND notification_type = p_notification_type
      AND edge_function = p_edge_function
      AND sent_at > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
  ) INTO v_already_sent;
  
  RETURN v_already_sent;
END;
$$;

COMMENT ON FUNCTION public.check_push_notification_sent IS 
'Verifica si ya se envió una notificación push para una cita y tipo específicos en el período especificado. Retorna TRUE si ya se envió, FALSE si no.';

-- =====================================================
-- FASE 3: FUNCIÓN HELPER PARA REGISTRAR NOTIFICACIÓN ENVIADA
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_push_notification_sent(
  p_appointment_id UUID,
  p_notification_type TEXT,
  p_edge_function TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  -- Insertar o actualizar el registro (UPSERT)
  INSERT INTO public.push_notification_sent (
    appointment_id,
    notification_type,
    edge_function,
    user_id,
    sent_at
  ) VALUES (
    p_appointment_id,
    p_notification_type,
    p_edge_function,
    p_user_id,
    NOW()
  )
  ON CONFLICT (appointment_id, notification_type, edge_function)
  DO UPDATE SET
    sent_at = NOW(),
    user_id = p_user_id
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$;

COMMENT ON FUNCTION public.record_push_notification_sent IS 
'Registra que se envió una notificación push para una cita. Si ya existe un registro, actualiza la fecha de envío. Retorna el ID del registro.';

-- =====================================================
-- FASE 4: MEJORAR create_appointment_status_notification
-- =====================================================

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
  _already_sent BOOLEAN;
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
      
      -- ✅ IDEMPOTENCIA: Verificar si ya se envió una notificación push para esta cita y tipo
      _already_sent := public.check_push_notification_sent(
        p_appointment_id := NEW.id,
        p_notification_type := _notification_type,
        p_edge_function := 'send-push-notification', -- El trigger SQL usa send-push-notification
        p_time_window_minutes := 30
      );
      
      IF _already_sent THEN
        RAISE NOTICE '[Push] PUSH::SKIPPED::already_sent - appointment_id=%, type=%, reason=Ya se envió push en los últimos 30 minutos', 
          NEW.id, _notification_type;
        RETURN NEW; -- ✅ NO crear appointment_notification si ya se envió
      END IF;
      
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
      ELSE
        RAISE NOTICE '[Push] PUSH::SKIPPED::duplicate_notification - appointment_id=%, type=%, reason=Ya existe appointment_notification en los últimos 10 minutos', 
          NEW.id, _notification_type;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FASE 5: MEJORAR send_push_on_appointment_notification
-- =====================================================

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
  v_business_id UUID;
  v_already_sent BOOLEAN;
  v_record_id UUID;
BEGIN
  RAISE NOTICE '[Push] === TRIGGER ACTIVADO ===';
  RAISE NOTICE '[Push] notification_id: %', NEW.id;
  RAISE NOTICE '[Push] appointment_id: %', NEW.appointment_id;
  
  -- ✅ CRÍTICO: Obtener business_id desde appointment
  SELECT business_id INTO v_business_id
  FROM public.appointments
  WHERE id = NEW.appointment_id
  LIMIT 1;
  
  -- Extraer título y mensaje del meta (JSONB)
  v_title := COALESCE(NEW.meta->>'title', 'Nueva notificación');
  v_message := COALESCE(NEW.meta->>'message', 'Tienes una nueva notificación');
  v_type := COALESCE(NEW.meta->>'type', 'appointment');
  v_recipient_type := COALESCE(NEW.meta->>'recipient_type', 'client');
  
  RAISE NOTICE '[Push] Tipo: %, Recipient: %, Title: %', v_type, v_recipient_type, v_title;
  
  -- ✅ CRÍTICO: Para notificaciones de tipo 'confirmation', SIEMPRE usar 'client'
  IF v_type = 'confirmation' THEN
    -- ✅ CORREGIDO: Pasar business_id como segundo parámetro
    v_user_id := COALESCE(NEW.user_id, public.get_client_user_id_from_appointment(NEW.appointment_id, v_business_id));
    v_user_role := 'client';
    RAISE NOTICE '[Push] ✅ Confirmación detectada: forzando role=client, user_id=%', v_user_id;
  ELSIF v_recipient_type = 'partner' OR v_recipient_type = 'business_owner' THEN
    v_user_id := public.get_partner_user_id_from_appointment(NEW.appointment_id);
    v_user_role := 'partner';
    RAISE NOTICE '[Push] Partner notification: user_id=%, role=%', v_user_id, v_user_role;
  ELSE
    -- ✅ CORREGIDO: Pasar business_id como segundo parámetro
    v_user_id := COALESCE(NEW.user_id, public.get_client_user_id_from_appointment(NEW.appointment_id, v_business_id));
    v_user_role := 'client';
    RAISE NOTICE '[Push] Client notification: user_id=%, role=%', v_user_id, v_user_role;
  END IF;
  
  -- 🚨 REGLA DE ORO: VALIDACIÓN OBLIGATORIA DE user_id
  IF v_user_id IS NULL THEN
    RAISE WARNING '[REGLA DE ORO] ❌ CANCELADO: v_user_id es NULL para appointment_notifications.id=%, appointment_id=%, type=%. NO se envía notificación push.', 
      NEW.id, NEW.appointment_id, v_type;
    RETURN NEW;
  END IF;
  
  -- ✅ VALIDACIÓN 2: user_id DEBE ser un UUID válido
  IF v_user_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE WARNING '[REGLA DE ORO] ❌ CANCELADO: v_user_id no es un UUID válido: % para appointment_notifications.id=%. NO se envía notificación push.', 
      v_user_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- ✅ IDEMPOTENCIA: Verificar si ya se envió una notificación push para esta cita y tipo
  v_already_sent := public.check_push_notification_sent(
    p_appointment_id := NEW.appointment_id,
    p_notification_type := v_type,
    p_edge_function := 'send-push-notification',
    p_time_window_minutes := 30
  );
  
  IF v_already_sent THEN
    RAISE NOTICE '[Push] PUSH::SKIPPED::already_sent - appointment_id=%, type=%, notification_id=%, reason=Ya se envió push en los últimos 30 minutos', 
      NEW.appointment_id, v_type, NEW.id;
    RETURN NEW; -- ✅ NO enviar push si ya se envió
  END IF;
  
  -- ✅ VALIDACIÓN 3: Si role = 'client', user_id es OBLIGATORIO (ya validado arriba, pero reforzamos)
  IF v_user_role = 'client' AND v_user_id IS NULL THEN
    RAISE WARNING '[REGLA DE ORO] ❌ CANCELADO: role=client pero v_user_id es NULL para appointment_notifications.id=%. NO se envía notificación push.', NEW.id;
    RETURN NEW;
  END IF;
  
  -- ✅ VALIDACIÓN 4: title y message son obligatorios
  IF v_title IS NULL OR v_message IS NULL THEN
    RAISE WARNING '[REGLA DE ORO] ❌ CANCELADO: v_title o v_message es NULL para appointment_notifications.id=%. NO se envía notificación push.', NEW.id;
    RETURN NEW;
  END IF;
  
  -- ✅ LOG: Validación exitosa
  RAISE NOTICE '[REGLA DE ORO] ✅ user_id validado correctamente: %, role: %', v_user_id, v_user_role;
  
  -- Actualizar user_id y role en appointment_notifications si no están
  IF NEW.user_id IS NULL OR NEW.role IS NULL OR NEW.role = '' THEN
    UPDATE public.appointment_notifications
    SET user_id = v_user_id, role = v_user_role
    WHERE id = NEW.id;
    RAISE NOTICE '[Push] Actualizado appointment_notifications: id=%, user_id=%, role=%', NEW.id, v_user_id, v_user_role;
  ELSIF NEW.role != v_user_role AND v_type = 'confirmation' THEN
    UPDATE public.appointment_notifications
    SET role = v_user_role
    WHERE id = NEW.id;
    RAISE NOTICE '[Push] Forzado role=client para confirmación: id=%', NEW.id;
  END IF;
  
  -- Construir data object
  v_data := jsonb_build_object(
    'type', v_type,
    'notification_id', NEW.id::text
  );
  
  IF NEW.meta IS NOT NULL AND jsonb_typeof(NEW.meta) = 'object' THEN
    v_data := v_data || NEW.meta;
  END IF;
  
  RAISE NOTICE '[Push] Llamando call_send_push_notification con: user_id=%, role=%, title=%', 
    v_user_id, v_user_role, v_title;
  
  -- ✅ Llamar a la función que envía el push (que también tiene validaciones)
  PERFORM public.call_send_push_notification(
    p_user_id := v_user_id,
    p_role := v_user_role,
    p_title := v_title,
    p_body := v_message,
    p_notification_id := NEW.id,
    p_data := v_data
  );
  
  -- ✅ REGISTRAR que se envió la notificación (idempotencia)
  v_record_id := public.record_push_notification_sent(
    p_appointment_id := NEW.appointment_id,
    p_notification_type := v_type,
    p_edge_function := 'send-push-notification',
    p_user_id := v_user_id
  );
  
  RAISE NOTICE '[Push] ✅ Notificación registrada en push_notification_sent: id=%', v_record_id;
  RAISE NOTICE '[Push] === TRIGGER COMPLETADO ===';
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[Push] === EXCEPCIÓN EN TRIGGER ===';
  RAISE WARNING '[Push] notification_id: %, appointment_id: %, type: %, error: %', 
    NEW.id, NEW.appointment_id, v_type, SQLERRM;
  RAISE WARNING '[Push] SQLSTATE: %', SQLSTATE;
  RETURN NEW;
END;
$$;

-- =====================================================
-- FASE 6: COMENTARIOS FINALES
-- =====================================================

COMMENT ON FUNCTION public.create_appointment_status_notification IS 
'Crea notificaciones cuando cambia el estado de una cita. Ahora incluye verificación de idempotencia para evitar duplicados.';

COMMENT ON FUNCTION public.send_push_on_appointment_notification IS 
'Envía push notification cuando se crea un registro en appointment_notifications. Ahora incluye verificación de idempotencia para evitar duplicados.';

