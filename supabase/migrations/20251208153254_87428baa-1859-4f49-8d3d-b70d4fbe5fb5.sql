-- Create client_profiles table for Client App users
-- This separates client users from business users (Partner App)

CREATE TABLE IF NOT EXISTS public.client_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  first_name text,
  last_name text,
  phone text,
  email text,
  avatar_url text,
  country_code text DEFAULT '+1',
  accepts_marketing boolean DEFAULT false,
  biometric_enabled boolean DEFAULT false,
  push_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_profiles
CREATE POLICY "Users can view own client profile" 
ON public.client_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own client profile" 
ON public.client_profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own client profile" 
ON public.client_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_client_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_client_profiles_updated_at();

-- Create trigger to auto-create client profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_client_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.client_profiles (id, first_name, last_name, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name',
    new.email
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;