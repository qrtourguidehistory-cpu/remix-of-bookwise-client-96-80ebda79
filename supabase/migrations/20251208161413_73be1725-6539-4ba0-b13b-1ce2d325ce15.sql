-- =====================================================
-- MIGRACIÓN: Correcciones de Seguridad y Esquema
-- Base de datos central: rdznelijpliklisnflfm
-- =====================================================

-- 1. CRÍTICO: Habilitar RLS en tabla staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 2. Política para que Partners gestionen su propio staff
CREATE POLICY "Business owners can manage own staff"
ON public.staff FOR ALL
USING (business_id = get_user_business_id())
WITH CHECK (business_id = get_user_business_id());

-- 3. Agregar columnas faltantes a businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- 4. Crear índices para optimizar búsquedas públicas
CREATE INDEX IF NOT EXISTS idx_businesses_is_public ON public.businesses(is_public);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);

-- 5. Política RLS para que clientes vean negocios públicos
CREATE POLICY "Anyone can view public businesses"
ON public.businesses FOR SELECT
USING (is_public = true AND is_active = true);