-- Fix review notifications: They should go to business owner, not client
-- When a client completes a review, the notification should be sent to the business owner

-- 1. Create or replace function to notify business owner when a review is completed
CREATE OR REPLACE FUNCTION public.notify_business_owner_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id UUID;
  _owner_id UUID;
  _client_name TEXT;
  _appointment_id UUID;
  _rating INTEGER;
  _comment TEXT;
  _notification_title TEXT;
  _notification_message TEXT;
BEGIN
  -- Only act if the status changed to 'completed' and it wasn't already completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    _appointment_id := NEW.appointment_id;
    _business_id := NEW.business_id;
    _rating := NEW.rating;
    _comment := NEW.comment;

    -- Get business owner ID
    SELECT owner_id INTO _owner_id
    FROM public.businesses
    WHERE id = _business_id;

    -- Get client name from appointment
    SELECT COALESCE(client_name, 'un cliente') INTO _client_name
    FROM public.appointments
    WHERE id = _appointment_id;

    IF _owner_id IS NOT NULL THEN
      _notification_title := 'Nueva reseña recibida';
      _notification_message := 'Has recibido una reseña de ' || _rating || ' estrellas';

      IF _comment IS NOT NULL AND _comment != '' THEN
        _notification_message := _notification_message || ' con un comentario: "' || _comment || '"';
      END IF;

      _notification_message := _notification_message || ' de ' || _client_name || ' para tu negocio.';

      -- Insert notification for the business owner
      -- IMPORTANT: This notification is for the business owner, not the client
      -- The meta.type = 'review_received' indicates this is for business owners
      INSERT INTO public.appointment_notifications (
        appointment_id,
        send_at,
        status,
        meta
      ) VALUES (
        _appointment_id,
        now(),
        'sent', -- Send immediately
        jsonb_build_object(
          'type', 'review_received',
          'title', _notification_title,
          'message', _notification_message,
          'business_id', _business_id,
          'rating', _rating,
          'comment', _comment,
          'client_name', _client_name,
          'recipient_type', 'business_owner' -- Mark as business owner notification
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_business_owner_review ON public.reviews;

-- 3. Create the trigger
CREATE TRIGGER trigger_notify_business_owner_review
AFTER UPDATE ON public.reviews
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION public.notify_business_owner_review();

-- 4. Update RLS policy to allow business owners to see their review notifications
-- The current policy allows clients to see notifications for their appointments
-- We need to also allow business owners to see notifications for their businesses

DROP POLICY IF EXISTS "Business owners can view their business notifications" ON public.appointment_notifications;

CREATE POLICY "Business owners can view their business notifications"
ON public.appointment_notifications FOR SELECT
TO public
USING (
  -- Allow if notification is for a business owned by the user
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.businesses b ON a.business_id = b.id
    WHERE a.id = appointment_notifications.appointment_id
      AND b.owner_id = auth.uid()
      AND (
        -- Only show review_received notifications to business owners
        (appointment_notifications.meta->>'type' = 'review_received')
        OR
        -- Or if the notification was created by the business owner (for other types)
        (appointment_notifications.meta->>'recipient_type' = 'business_owner')
      )
  )
);

