# Configuración de Notificaciones Push FCM para Cliente

## Resumen

Se ha implementado el envío automático de notificaciones push FCM para clientes cuando se crean notificaciones relevantes. Las notificaciones ahora se envían al centro de notificaciones del celular incluso cuando la app está cerrada o bloqueada.

## Cambios Implementados

### 1. Migración: `20251228000000_add_fcm_push_to_client_notifications.sql`

Esta migración agrega:

- **Extensión `pg_net`**: Permite hacer llamadas HTTP desde PostgreSQL
- **Función `send_fcm_notification`**: Helper para enviar push notifications vía FCM
- **Función `get_client_user_id_from_appointment`**: Obtiene el `user_id` del cliente desde una cita
- **Modificación de `create_appointment_status_notification`**: Ahora también:
  - Crea notificaciones en `client_notifications`
  - Envía push FCM para eventos críticos (confirmation, completion, cancellation, no_show)
- **Modificación de `create_review_request_notification`**: Ahora también:
  - Crea notificaciones en `client_notifications`
  - Envía push FCM para solicitudes de reseña

### 2. Eventos Cubiertos

Los siguientes eventos ahora envían push notifications FCM:

- ✅ **Confirmación de cita** (`confirmation`): Cuando una cita cambia a estado `confirmed`
- ✅ **Cita completada** (`completion`): Cuando una cita cambia a estado `completed`
- ✅ **Cita cancelada** (`cancellation`): Cuando una cita cambia a estado `cancelled`
- ✅ **No asistencia** (`no_show`): Cuando una cita cambia a estado `no_show`
- ✅ **Solicitud de reseña** (`review_request`): Cuando una cita se completa y se solicita reseña

### 3. Flujo de Notificaciones

1. **Trigger se activa** cuando cambia el estado de una cita
2. **Se crea `appointment_notification`** (para compatibilidad con Partner App)
3. **Se crea `client_notification`** (para la app cliente)
4. **Se envía push FCM** usando la Edge Function `send-fcm-notification`
5. **La notificación aparece** en el centro de notificaciones del celular

## Configuración Requerida

### Paso 1: Configurar Variables de Entorno en Supabase

La función `send_fcm_notification` necesita acceso a:
- URL de Supabase
- Service Role Key

**Configurar URL de Supabase (Opcional)**

La función tiene un valor por defecto para la URL, pero puedes configurarlo explícitamente:

```sql
-- Configurar URL de Supabase (opcional, tiene valor por defecto)
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://rdznelijpliklisnflfm.supabase.co';
```

**Nota**: La Edge Function `send-fcm-notification` tiene `verify_jwt = false`, por lo que no requiere autenticación JWT. Las variables de entorno de la Edge Function (como `FIREBASE_SERVICE_ACCOUNT` y `SUPABASE_SERVICE_ROLE_KEY`) se configuran en el Dashboard de Supabase, no en PostgreSQL.

### Paso 2: Verificar que la Edge Function `send-fcm-notification` esté desplegada

Asegúrate de que la Edge Function `send-fcm-notification` esté desplegada y configurada correctamente. Verifica:

1. Que la función existe en `supabase/functions/send-fcm-notification/`
2. Que tiene las variables de entorno configuradas:
   - `FIREBASE_SERVICE_ACCOUNT`: JSON del service account de Firebase
   - `SUPABASE_URL`: URL del proyecto
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Paso 3: Verificar que `pg_net` esté habilitado

La migración habilita automáticamente la extensión `pg_net`, pero puedes verificarlo:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_net';
```

Si no está habilitada, ejecuta:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

## Verificación

### 1. Verificar Logs

Los triggers ahora incluyen logs claros. Puedes verificar en los logs de Supabase:

```sql
-- Ver logs recientes de notificaciones FCM
SELECT * FROM net.http_request_queue 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 2. Probar Notificación

1. Crea o actualiza una cita para cambiar su estado a `confirmed`
2. Verifica que:
   - Se crea una entrada en `client_notifications`
   - Se crea una entrada en `appointment_notifications`
   - Se envía un push FCM (verifica en los logs)

### 3. Verificar en el Dispositivo

- Abre la app cliente en un dispositivo físico
- Asegúrate de que las notificaciones push estén habilitadas
- Cambia el estado de una cita
- Verifica que la notificación aparezca en el centro de notificaciones del celular

## Logs y Debugging

Los triggers incluyen logs claros con el prefijo `[FCM]`:

- `RAISE NOTICE`: Logs informativos cuando se envía una notificación
- `RAISE WARNING`: Logs de advertencia cuando hay errores (no fallan la transacción)

Ejemplo de logs:

```
[FCM] Push notification queued for user abc123 (job_id: 456): Cita confirmada - Tu cita en...
```

## Solución de Problemas

### Problema: Las notificaciones no se envían

1. **Verifica la URL de Supabase** (opcional, tiene valor por defecto):
   ```sql
   SHOW app.settings.supabase_url;
   ```

2. **Verifica que `pg_net` esté habilitado**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

3. **Verifica los logs de la Edge Function** en Supabase Dashboard > Edge Functions > send-fcm-notification > Logs

4. **Verifica que el cliente tenga tokens FCM registrados**:
   ```sql
   SELECT * FROM client_devices WHERE user_id = 'USER_ID_AQUI';
   ```

### Problema: Error "Service role key not configured"

Configura la variable de entorno como se indica en el Paso 1.

### Problema: Las notificaciones se crean pero no aparecen en el celular

1. Verifica que el dispositivo tenga tokens FCM registrados en `client_devices`
2. Verifica que la Edge Function `send-fcm-notification` esté funcionando correctamente
3. Verifica los logs de Firebase Cloud Messaging
4. Verifica que la app tenga permisos de notificaciones en el dispositivo

## Notas Importantes

- ⚠️ **Una notificación = un push**: El sistema evita duplicados verificando notificaciones creadas en los últimos 10 minutos
- ⚠️ **Solo para clientes**: Las notificaciones FCM solo se envían para usuarios de tipo `client`, no para `partner`
- ⚠️ **Requiere user_id**: Si una cita no tiene `user_id` o no se puede encontrar por `client_email`, no se enviará push FCM (pero se creará la notificación en `appointment_notifications`)
- ⚠️ **No bloquea transacciones**: Si el envío de FCM falla, la creación de la cita/notificación no falla (solo se registra un warning)

## Próximos Pasos

Si necesitas agregar más tipos de notificaciones:

1. Identifica el trigger o función que crea la notificación
2. Agrega la creación de `client_notification` si no existe
3. Llama a `send_fcm_notification` después de crear la notificación
4. Asegúrate de obtener el `user_id` del cliente correctamente

Ejemplo:

```sql
-- Después de crear la notificación
PERFORM public.send_fcm_notification(
  p_user_id := _client_user_id,
  p_title := _notification_title,
  p_body := _notification_message,
  p_data := jsonb_build_object(
    'type', 'tu_tipo',
    'appointment_id', _appointment_id::text
  )
);
```

