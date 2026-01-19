# 🚨 Solución Inmediata: Error URL NULL en Push Notifications

## Problema Detectado

Los logs muestran:
```
ERROR: null value in column "url" of relation "http_request_queue" violates not-null constraint
```

Esto significa que `pg_net.http_post()` está recibiendo una URL NULL.

## Solución Manual Inmediata

**Opción 1: Ejecutar este SQL directamente en el SQL Editor de Supabase:**

```sql
-- Reemplazar solo la sección problemática de la función
CREATE OR REPLACE FUNCTION public.call_send_push_notification(
  p_user_id UUID,
  p_role TEXT,
  p_title TEXT,
  p_body TEXT,
  p_notification_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_function_url TEXT;
  v_response_id BIGINT;
  v_request_body JSONB;
  v_normalized_role TEXT;
BEGIN
  -- Validaciones
  IF p_user_id IS NULL OR p_title IS NULL OR p_body IS NULL THEN
    RETURN;
  END IF;
  
  -- Normalizar role
  v_normalized_role := LOWER(TRIM(COALESCE(p_role, 'client')));
  
  -- URL HARDCODEADA como fallback (esto corrige el error)
  v_supabase_url := 'https://rdznelijpliklisnflfm.supabase.co';
  
  -- Intentar obtener desde settings, pero usar hardcoded si falla
  BEGIN
    v_supabase_url := COALESCE(
      NULLIF(current_setting('app.settings.supabase_url', true), ''),
      v_supabase_url
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- Usar la URL hardcodeada
  END;
  
  -- Construir URL completa
  v_function_url := v_supabase_url || '/functions/v1/send-push-notification';
  
  -- Obtener service key
  v_service_role_key := public.get_service_role_key();
  
  -- Construir payload
  v_request_body := jsonb_build_object(
    'user_id', p_user_id::text,
    'title', p_title,
    'body', p_body,
    'role', v_normalized_role,
    'data', COALESCE(p_data, '{}'::jsonb),
    'notification_id', CASE WHEN p_notification_id IS NOT NULL THEN p_notification_id::text ELSE NULL END
  );
  
  -- Llamar a pg_net (ahora con URL garantizada)
  BEGIN
    SELECT net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := v_request_body,
      timeout_milliseconds := 30000
    ) INTO v_response_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Push] Error: %', SQLERRM;
  END;
END;
$$;
```

## Después de Aplicar

1. **Probar confirmando una cita desde Partner App**
2. **Verificar logs de PostgreSQL** buscando mensajes `[Push]`
3. **Verificar logs de Edge Function** en Supabase Dashboard
4. **Verificar que la notificación llegue al cliente**

## Próximos Pasos

Si después de aplicar esto las notificaciones aún no llegan:
1. Revisar los logs de PostgreSQL para ver qué está pasando
2. Revisar los logs de la Edge Function
3. Verificar que el dispositivo del cliente esté registrado en `client_devices`

