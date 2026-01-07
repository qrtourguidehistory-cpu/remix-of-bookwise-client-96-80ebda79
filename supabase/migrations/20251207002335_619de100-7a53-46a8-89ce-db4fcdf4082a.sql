-- Fix RLS on tables that have it disabled

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for app_settings - only authenticated users can read
CREATE POLICY "Anyone can view app settings" 
ON public.app_settings FOR SELECT 
USING (true);

-- Enable RLS on appointment_notifications
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for appointment_notifications
CREATE POLICY "Users can view their appointment notifications" 
ON public.appointment_notifications FOR SELECT 
USING (true);

-- Enable RLS on blocked_time
ALTER TABLE public.blocked_time ENABLE ROW LEVEL SECURITY;

-- Create policy for blocked_time
CREATE POLICY "Anyone can view blocked time" 
ON public.blocked_time FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage blocked time" 
ON public.blocked_time FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS on business_working_hours  
ALTER TABLE public.business_working_hours ENABLE ROW LEVEL SECURITY;

-- Create policy for business_working_hours
CREATE POLICY "Anyone can view business working hours" 
ON public.business_working_hours FOR SELECT 
USING (true);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policy for payments
CREATE POLICY "Business owners can view payments" 
ON public.payments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create payments" 
ON public.payments FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Enable RLS on refunds
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Create policy for refunds
CREATE POLICY "Business owners can view refunds" 
ON public.refunds FOR SELECT 
USING (true);

-- Enable RLS on sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policy for sales
CREATE POLICY "Business owners can manage sales" 
ON public.sales FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix functions with mutable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_old_reviews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reviews
  SET status = 'expired'
  WHERE status = 'pending'
    AND expiration_date < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$;