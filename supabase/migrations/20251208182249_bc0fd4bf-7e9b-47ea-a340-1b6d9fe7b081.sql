-- Agregar campos faltantes a establishments para alinear con businesses
ALTER TABLE public.establishments 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_establishments_slug ON public.establishments(slug);
CREATE INDEX IF NOT EXISTS idx_establishments_category ON public.establishments(category);

-- Actualizar rating existente a average_rating si existe
UPDATE public.establishments 
SET average_rating = rating 
WHERE rating IS NOT NULL AND average_rating = 0;

-- Actualizar total_reviews desde review_count si existe
UPDATE public.establishments 
SET total_reviews = review_count 
WHERE review_count IS NOT NULL AND total_reviews = 0;