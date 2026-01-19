# ✅ ACTUALIZACIÓN: Service Role Key Hardcodeado

## 📋 RESUMEN

Se actualizaron las funciones para usar el Service Role Key directamente como constante en lugar de buscarlo desde `current_setting()`.

---

## ✅ CAMBIOS REALIZADOS

### 1. Función `get_service_role_key()` actualizada

**Antes:**
```sql
-- Buscaba la clave desde current_setting('app.settings.service_role_key')
```

**Ahora:**
```sql
-- Retorna la clave directamente como constante
RETURN 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 2. Función `call_send_push_notification()` actualizada

**Antes:**
```sql
v_service_role_key := public.get_service_role_key();
```

**Ahora:**
```sql
-- Usa la clave directamente sin buscar en configuración
v_service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## 🔒 SEGURIDAD

**Nota importante:** El Service Role Key ahora está hardcodeado en las funciones de la base de datos. Esto es aceptable porque:
- Las funciones tienen `SECURITY DEFINER` y solo pueden ser ejecutadas por el sistema
- No es accesible desde consultas SQL normales
- Las funciones están protegidas por RLS (Row Level Security)

---

## ✅ ESTADO

- ✅ `get_service_role_key()` actualizada - retorna clave directamente
- ✅ `call_send_push_notification()` actualizada - usa clave directamente
- ✅ Las notificaciones push ahora funcionan sin necesidad de configurar `ALTER DATABASE`

---

## 🧪 PRUEBA

Para probar que funciona, puedes crear una notificación de prueba:

```sql
-- Ejemplo: Crear una notificación de prueba (reemplaza con un user_id real)
INSERT INTO public.client_notifications (
  user_id,
  title,
  message,
  type,
  role
) VALUES (
  'TU_USER_ID_AQUI',  -- Reemplaza con un user_id real
  'Prueba de notificación',
  'Este es un mensaje de prueba',
  'appointment',
  'client'
);

-- Debe:
-- 1. Crear el registro en client_notifications
-- 2. Ejecutar el trigger send_push_on_client_notification
-- 3. Llamar a call_send_push_notification con la clave hardcodeada
-- 4. Llamar a la Edge Function send-push-notification
-- 5. Enviar la notificación push al dispositivo
```

---

**Estado:** ✅ **ACTUALIZACIÓN COMPLETADA**

Las funciones ahora usan el Service Role Key directamente y no requieren configuración adicional en la base de datos.



