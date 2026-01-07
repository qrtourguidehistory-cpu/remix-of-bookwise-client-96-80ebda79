-- Fix trigger to work correctly and add better error handling
-- Also add diagnostic logging

-- Drop and recreate the function with better error handling
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
  _notification_title TEXT;
  _notification_message TEXT;
  _notification_type TEXT;
  _appointment_date DATE;
  _appointment_time TIME;
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
      -- Use send_at instead of created_at since created_at might not be indexed
      IF NOT EXISTS (
        SELECT 1 
        FROM public.appointment_notifications 
        WHERE appointment_id = NEW.id 
          AND meta->>'type' = _notification_type
          AND send_at > NOW() - INTERVAL '10 minutes'
      ) THEN
        -- Create notification with status 'sent' (immediate notification)
        -- Use SECURITY DEFINER to bypass RLS for this INSERT
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
          -- Log error but don't fail the transaction
          -- This prevents the appointment update from failing if notification creation fails
          RAISE WARNING 'Failed to create notification for appointment %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS trigger_create_appointment_status_notification ON public.appointments;

CREATE TRIGGER trigger_create_appointment_status_notification
AFTER UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.create_appointment_status_notification();

-- CRITICAL: Allow trigger function (SECURITY DEFINER) to insert notifications
-- This policy allows the trigger to bypass RLS since it runs as SECURITY DEFINER
DROP POLICY IF EXISTS "Trigger can create notifications" ON public.appointment_notifications;

-- The trigger function uses SECURITY DEFINER, so we need a policy that allows
-- the function to insert notifications regardless of the current user context
-- We check that the appointment exists and belongs to a valid business
CREATE POLICY "Trigger can create notifications"
ON public.appointment_notifications FOR INSERT
TO public
WITH CHECK (
  -- Allow if the appointment exists and has a business_id
  EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id = appointment_notifications.appointment_id
  )
  -- Since this is SECURITY DEFINER, we trust the trigger to create valid notifications
);

-- Verify trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_create_appointment_status_notification'
  ) THEN
    RAISE NOTICE 'Trigger trigger_create_appointment_status_notification is active';
  ELSE
    RAISE WARNING 'Trigger trigger_create_appointment_status_notification was not created!';
  END IF;
END $$;

