-- Create notification for client when appointment is completed
-- This triggers a review request notification so clients can leave a review

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
  _appointment_id UUID;
  _notification_title TEXT;
  _notification_message TEXT;
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
    
    -- Check if a review already exists for this appointment
    -- Only send review request if no review exists yet
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
        -- Create review request notification for the client
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
            'recipient_type', 'client' -- Explicitly mark as client notification
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_review_request_notification ON public.appointments;

-- Create the trigger
CREATE TRIGGER trigger_create_review_request_notification
AFTER UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION public.create_review_request_notification();

-- Comment
COMMENT ON FUNCTION public.create_review_request_notification IS 
'Creates a review_request notification for the client when an appointment is marked as completed. This allows clients to leave reviews after their appointments.';

