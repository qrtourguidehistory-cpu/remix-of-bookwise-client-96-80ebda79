-- Auto-create appointment notifications when appointment status changes
-- This ensures that notifications are created even if Partner App doesn't call the notification service

-- Function to create notification when appointment status changes
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
  _client_email TEXT;
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
    _client_email := COALESCE(NEW.client_email, '');
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
    -- Check if a notification for this appointment and type already exists to prevent duplicates
    IF NEW.id IS NOT NULL AND _business_id IS NOT NULL THEN
      -- Check if a notification with the same appointment_id and type already exists (within last 5 minutes)
      -- This prevents duplicate notifications from being created if the trigger fires multiple times
      IF NOT EXISTS (
        SELECT 1 
        FROM public.appointment_notifications 
        WHERE appointment_id = NEW.id 
          AND meta->>'type' = _notification_type
          AND created_at > NOW() - INTERVAL '5 minutes'
      ) THEN
        -- Create notification with status 'sent' (immediate notification)
        INSERT INTO public.appointment_notifications (
          appointment_id,
          send_at,
          status,
          meta
        ) VALUES (
          NEW.id,
          NOW(), -- Send immediately
          'sent', -- Mark as sent immediately
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
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_appointment_status_notification ON public.appointments;

-- Create the trigger
CREATE TRIGGER trigger_create_appointment_status_notification
AFTER UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.create_appointment_status_notification();

-- Comment explaining the trigger
COMMENT ON FUNCTION public.create_appointment_status_notification IS 
'Automatically creates appointment_notifications when appointment status changes to confirmed, completed, cancelled, or no_show. This ensures clients receive notifications even if Partner App does not explicitly create them.';

