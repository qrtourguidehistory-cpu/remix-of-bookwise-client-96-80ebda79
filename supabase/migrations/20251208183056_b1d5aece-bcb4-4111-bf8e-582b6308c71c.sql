-- Phase 1: Add establishment_id to services and staff tables
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_establishment_id ON public.services(establishment_id);
CREATE INDEX IF NOT EXISTS idx_staff_establishment_id ON public.staff(establishment_id);

-- Phase 2: Fix the client_profiles trigger
DROP TRIGGER IF EXISTS on_auth_user_created_client ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_client_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_profiles (id, first_name, last_name, email, created_at, updated_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_client
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client_user();

-- Phase 3: Ensure RLS policies are correct for client_profiles
DROP POLICY IF EXISTS "Users can insert own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can update own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can view own client profile" ON public.client_profiles;

CREATE POLICY "Users can insert own client profile" ON public.client_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own client profile" ON public.client_profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own client profile" ON public.client_profiles
FOR SELECT USING (auth.uid() = id);