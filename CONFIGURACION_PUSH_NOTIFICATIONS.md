# 🚀 CONFIGURACIÓN COMPLETA DE NOTIFICACIONES PUSH

## 📋 RESUMEN

Este script SQL maestro configura completamente el sistema de notificaciones push para que funcione automáticamente. El script:

1. ✅ **Elimina** todos los triggers y funciones antiguas relacionados con notificaciones
2. ✅ **Sincroniza** las tablas `client_notifications` y `appointment_notifications` con las columnas necesarias (incluyendo `role`)
3. ✅ **Crea** nuevos triggers que llaman automáticamente a `send-push-notification` con el `role` correcto
4. ✅ **Determina automáticamente** el `role` (`client` o `partner`) basándose en la relación del usuario
5. ✅ **Envía push notifications** usando el Service Account correcto según el rol

---

## ⚠️ PASO CRÍTICO: CONFIGURAR SERVICE ROLE KEY

**ANTES de ejecutar el script, debes configurar tu Service Role Key:**

### 1. Obtener tu Service Role Key:

1. Ve a tu Supabase Dashboard: https://supabase.com/dashboard/project/rdznelijpliklisnflfm
2. Navega a **Settings** → **API**
3. Copia el **`service_role` key** (es secreta, no la compartas)

### 2. Configurar el Service Role Key en la base de datos:

Ejecuta este comando SQL en tu Supabase SQL Editor **ANTES** de ejecutar el script principal:

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'TU_SERVICE_ROLE_KEY_AQUI';
```

**Ejemplo:**
```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJk...';
```

---

## 📝 EJECUTAR EL SCRIPT

### Opción 1: Desde Supabase Dashboard

1. Ve a **SQL Editor** en tu Supabase Dashboard
2. Abre el archivo `supabase/migrations/20260126000000_complete_push_notifications_setup.sql`
3. Copia todo el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **RUN**

### Opción 2: Desde CLI (si tienes Supabase CLI)

```bash
supabase db push
```

---

## 🔍 QUÉ HACE EL SCRIPT

### FASE 1: Limpieza
- Elimina todos los triggers antiguos relacionados con notificaciones
- Elimina todas las funciones antiguas relacionadas con notificaciones

### FASE 2-3: Configuración Base
- Habilita la extensión `pg_net` (necesaria para llamadas HTTP)
- Configura la URL de Supabase
- Crea función helper para obtener Service Role Key

### FASE 4-5: Sincronización de Tablas
- **client_notifications**: Añade columnas `user_id`, `title`, `message`, `type`, `role`
- **appointment_notifications**: Añade columnas `user_id`, `role`
- Actualiza registros existentes con `role` apropiado
- Crea índices para optimizar consultas

### FASE 6-7: Funciones Helper
- `get_service_role_key()`: Obtiene el Service Role Key desde configuración
- `call_send_push_notification()`: Llama a la Edge Function `send-push-notification` con el `role` correcto

### FASE 8: Determinación Automática de Role
- `determine_user_role()`: Determina si un usuario es `client` o `partner`
- `get_client_user_id_from_appointment()`: Obtiene `user_id` del cliente desde un appointment
- `get_partner_user_id_from_appointment()`: Obtiene `user_id` del partner (dueño del negocio) desde un appointment

### FASE 9-10: Triggers Automáticos
- **Trigger en `client_notifications`**: Cuando se crea un registro, automáticamente:
  1. Determina el `role` si no está especificado
  2. Llama a `send-push-notification` con el `role` correcto
  3. La Edge Function usa el secret correcto (`FIREBASE_SERVICE_ACCOUNT_CLIENT` o `FIREBASE_SERVICE_ACCOUNT_PARTNER`)

- **Trigger en `appointment_notifications`**: Cuando se crea un registro, automáticamente:
  1. Extrae `title` y `message` del campo `meta` (JSONB)
  2. Determina `user_id` y `role` basándose en `recipient_type`
  3. Llama a `send-push-notification` con el `role` correcto

### FASE 11-12: Funciones de Creación de Notificaciones
- `create_appointment_status_notification()`: Crea notificaciones cuando cambia el estado de una cita
- `create_review_request_notification()`: Crea notificaciones de solicitud de reseña
- Ambas funciones ahora crean `client_notifications` con `role` automático

---

## 🎯 FLUJO COMPLETO

### Cuando se crea una cita o cambia su estado:

1. **Trigger `create_appointment_status_notification`** se ejecuta
2. Crea un registro en `appointment_notifications`
3. Crea un registro en `client_notifications` con `role = 'client'` (determinado automáticamente)
4. **Trigger `send_push_on_client_notification`** detecta el nuevo registro
5. Llama a `call_send_push_notification(user_id, 'client', title, message, ...)`
6. Esta función llama a la Edge Function `send-push-notification` con:
   - Header: `Authorization: Bearer <SERVICE_ROLE_KEY>`
   - Body: `{ user_id, title, body, role: 'client', ... }`
7. La Edge Function detecta `role === 'client'` y usa `FIREBASE_SERVICE_ACCOUNT_CLIENT`
8. Envía la notificación push al dispositivo del cliente

### Cuando el dueño del negocio necesita recibir una notificación:

1. Se crea un registro en `appointment_notifications` con `meta->>'recipient_type' = 'partner'`
2. **Trigger `send_push_on_appointment_notification`** detecta el nuevo registro
3. Determina que `recipient_type = 'partner'`
4. Obtiene el `user_id` del dueño del negocio
5. Llama a `call_send_push_notification(owner_user_id, 'partner', title, message, ...)`
6. La Edge Function detecta `role === 'partner'` y usa `FIREBASE_SERVICE_ACCOUNT_PARTNER`
7. Envía la notificación push al dispositivo del partner

---

## ✅ VERIFICACIÓN

Después de ejecutar el script, verifica que todo esté configurado correctamente:

### 1. Verificar columnas en las tablas:

```sql
-- Verificar client_notifications
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'client_notifications'
ORDER BY ordinal_position;

-- Debe mostrar: id, user_id, appointment_id, business_id, type, title, message, role, read, meta, created_at, updated_at
```

### 2. Verificar triggers:

```sql
-- Verificar triggers
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE '%notification%' OR tgname LIKE '%push%'
ORDER BY tgname;

-- Debe mostrar:
-- - trigger_create_appointment_status_notification
-- - trigger_create_review_request_notification
-- - trigger_send_push_on_client_notification
-- - trigger_send_push_on_appointment_notification
```

### 3. Verificar funciones:

```sql
-- Verificar funciones
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%notification%' OR routine_name LIKE '%push%'
ORDER BY routine_name;

-- Debe mostrar todas las funciones creadas
```

### 4. Probar manualmente:

```sql
-- Crear una notificación de prueba
INSERT INTO public.client_notifications (
  user_id,
  title,
  message,
  type,
  role
) VALUES (
  'TU_USER_ID_AQUI',  -- Reemplaza con un user_id real
  'Notificación de prueba',
  'Este es un mensaje de prueba',
  'appointment',
  'client'  -- O 'partner'
);

-- Debe:
-- 1. Crear el registro en client_notifications
-- 2. Ejecutar el trigger send_push_on_client_notification
-- 3. Llamar a la Edge Function send-push-notification
-- 4. Enviar la notificación push al dispositivo
```

---

## 🔧 TROUBLESHOOTING

### Error: "Service Role Key no está configurada"

**Solución:** Ejecuta:
```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'TU_SERVICE_ROLE_KEY_AQUI';
```

### Error: "relation 'pg_net' does not exist"

**Solución:** La extensión `pg_net` no está habilitada. Ejecuta:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Las notificaciones no se envían

**Verifica:**
1. ¿El Service Role Key está configurado correctamente?
2. ¿Los secrets `FIREBASE_SERVICE_ACCOUNT_CLIENT` y `FIREBASE_SERVICE_ACCOUNT_PARTNER` están configurados en Supabase?
3. ¿La Edge Function `send-push-notification` está desplegada?
4. ¿Los dispositivos tienen tokens FCM registrados en `client_devices` o `partner_devices`?

**Revisar logs:**
- Ve a Supabase Dashboard → Edge Functions → `send-push-notification` → Logs
- Busca errores relacionados con `FIREBASE_SERVICE_ACCOUNT_*`

### El role no se determina correctamente

**Verifica:**
```sql
-- Verificar si un usuario es partner
SELECT public.determine_user_role('TU_USER_ID_AQUI');

-- Debe retornar 'partner' si el usuario tiene un negocio, o 'client' en caso contrario
```

---

## 📚 REFERENCIAS

- **Service Role Key**: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api
- **Edge Function `send-push-notification`**: `supabase/functions/send-push-notification/index.ts`
- **Secrets de Supabase**: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/functions

---

## ✅ ESTADO FINAL

Después de ejecutar este script:

- ✅ Todas las notificaciones push se envían automáticamente
- ✅ El `role` se determina automáticamente (`client` o `partner`)
- ✅ Se usa el Service Account correcto según el rol
- ✅ Los triggers funcionan en tiempo real
- ✅ No necesitas llamar manualmente a la Edge Function

**¡Las notificaciones push ahora funcionan completamente!** 🎉



