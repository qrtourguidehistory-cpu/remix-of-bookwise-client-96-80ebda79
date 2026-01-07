-- =====================================================
-- VALIDACIÓN: Prevención de Recursión Infinita en RLS
-- =====================================================
-- 
-- Este script valida que no haya políticas RLS que puedan causar recursión infinita
-- Ejecutar periódicamente o antes de crear nuevas políticas RLS
--
-- REGLAS DE VALIDACIÓN:
-- 1. Las políticas NO deben hacer JOIN con la misma tabla que protegen
-- 2. Las políticas NO deben hacer subconsultas que referencien directamente la tabla protegida
-- 3. Si se necesita verificar datos en la misma tabla, usar funciones SECURITY DEFINER STABLE
-- =====================================================

-- Verificar políticas que hacen JOIN con la misma tabla
SELECT 
    schemaname,
    tablename,
    policyname,
    '⚠️ WARNING: Policy may cause recursion - uses JOIN with same table' as issue,
    qual as policy_definition
FROM pg_policies
WHERE qual LIKE '%JOIN ' || tablename || '%'
   OR qual LIKE '%FROM ' || tablename || ' %' || tablename || '%'
ORDER BY tablename, policyname;

-- Verificar que las funciones helper existan y tengan las propiedades correctas
SELECT 
    proname,
    CASE 
        WHEN NOT prosecdef THEN '❌ ERROR: Missing SECURITY DEFINER'
        WHEN provolatile != 's' THEN '❌ ERROR: Not marked as STABLE'
        ELSE '✅ OK: Function has correct properties'
    END as validation_status
FROM pg_proc
WHERE proname LIKE '%partner%client%profile%'
ORDER BY proname;

-- Verificar que las políticas usen las funciones helper en lugar de JOINs directos
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%is_partner%' THEN '✅ OK: Uses helper function'
        WHEN qual LIKE '%JOIN profiles%' AND tablename = 'profiles' THEN '❌ ERROR: Direct JOIN with same table'
        WHEN qual LIKE '%JOIN client_profiles%' AND tablename = 'client_profiles' THEN '❌ ERROR: Direct JOIN with same table'
        ELSE '✅ OK: Safe policy'
    END as validation_status
FROM pg_policies
WHERE tablename IN ('profiles', 'client_profiles')
ORDER BY tablename, policyname;

