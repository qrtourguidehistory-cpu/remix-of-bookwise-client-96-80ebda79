-- Add latitude and longitude columns to businesses table for map markers
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Create index for geo queries
CREATE INDEX IF NOT EXISTS idx_businesses_geo ON public.businesses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;