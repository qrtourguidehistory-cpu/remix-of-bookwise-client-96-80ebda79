-- Add business_id column to favorites to support businesses from Partner app
ALTER TABLE public.favorites 
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Make establishment_id nullable since we may use either business_id or establishment_id
ALTER TABLE public.favorites 
ALTER COLUMN establishment_id DROP NOT NULL;

-- Add constraint to ensure at least one ID is present
ALTER TABLE public.favorites
ADD CONSTRAINT favorites_has_business_or_establishment
CHECK (business_id IS NOT NULL OR establishment_id IS NOT NULL);

-- Update RLS policies for favorites to include business_id
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.favorites;
CREATE POLICY "Users can insert their own favorites" ON public.favorites
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
CREATE POLICY "Users can delete their own favorites" ON public.favorites
FOR DELETE USING (auth.uid() = user_id);