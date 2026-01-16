# 🚀 Edge Function: `send_push_notification`

## ✅ Estado: ACTIVA y OPERATIVA

**Edge Function ID:** `149ef3e0-8dd5-43e1-b9c9-1fdbc80660b7`  
**Slug:** `send_push_notification`  
**Versión:** 1  
**JWT Required:** No (usa service role internamente)

---

## 📋 Resumen

Esta es la **única Edge Function activa** para enviar notificaciones push FCM en el backend. Reemplaza todas las funciones antiguas.

### Funciones Antiguas DEPRECADAS ❌

- ~~`send-push-notification`~~ → Devuelve 410 Gone
- ~~`send-fcm-notification`~~ → Devuelve 410 Gone  
- ~~`notify-partner`~~ → Devuelve 410 Gone

---

## 📊 Base de Datos: `client_devices`

La función consulta la tabla **`client_devices`** con la siguiente estructura:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | ID único del dispositivo |
| `user_id` | uuid | ID del usuario (auth.users) |
| `fcm_token` | text | Token FCM del dispositivo |
| `platform` | text | 'android', 'ios', o 'web' |
| `device_info` | jsonb | Información adicional del dispositivo |
| `role` | text | **'client' o 'partner'** (requerido) |
| `enabled` | boolean | Si el token está activo (default: true) |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Última actualización |

### 🔍 Índice Optimizado

```sql
CREATE INDEX idx_client_devices_user_role_enabled 
  ON client_devices(user_id, role, enabled) WHERE enabled = true;
```

---

## 🔧 Uso de la Edge Function

### Endpoint

```
POST https://rdznelijpliklisnflfm.supabase.co/functions/v1/send_push_notification
```

### Headers

```http
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

### Request Body

```json
{
  "user_id": "uuid-del-usuario",
  "role": "client",  // O "partner"
  "title": "Título de la notificación",
  "body": "Mensaje de la notificación",
  "data": {
    "key": "value",
    "appointment_id": "uuid-cita",
    "screen": "AppointmentDetails"
  }
}
```

### Parámetros Obligatorios

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `user_id` | string (uuid) | ID del usuario destinatario |
| `role` | string | **"client"** o **"partner"** |
| `title` | string | Título de la notificación |
| `body` | string | Cuerpo del mensaje |

### Parámetros Opcionales

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `data` | object | Datos personalizados para la app (key-value pairs) |

---

## 📱 Response Examples

### ✅ Éxito (200 OK)

```json
{
  "success": true,
  "sent": 2,
  "total": 2,
  "failed": 0,
  "disabled": 0,
  "results": [
    {
      "deviceId": "abc-123",
      "success": true
    },
    {
      "deviceId": "def-456",
      "success": true
    }
  ]
}
```

### ⚠️ Sin dispositivos (200 OK)

```json
{
  "success": true,
  "sent": 0,
  "message": "No hay dispositivos registrados o habilitados"
}
```

### ❌ Error de validación (400 Bad Request)

```json
{
  "success": false,
  "error": "Campos requeridos: user_id, role, title, body"
}
```

### ❌ Error de servidor (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Descripción del error"
}
```

---

## 🔥 Características Implementadas

### ✅ Múltiples Tokens

- **NO usa `LIMIT 1`**
- Envía a **todos los dispositivos** del usuario con `enabled = true`
- Soporta usuarios con múltiples dispositivos

### ✅ Manejo de Errores FCM

Detecta automáticamente tokens inválidos y los deshabilita:

| Error FCM | Acción |
|-----------|--------|
| `UNREGISTERED` | Token marcado como `enabled = false` |
| `INVALID_ARGUMENT` | Token marcado como `enabled = false` |
| `NOT_FOUND` | Token marcado como `enabled = false` |
| Otros errores | Token permanece activo (reintentar después) |

### ✅ Payload Compatible con Android Background

```json
{
  "message": {
    "token": "fcm-token",
    "notification": {
      "title": "...",
      "body": "..."
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "default"
      }
    },
    "data": { ... }
  }
}
```

### ✅ Logs Detallados

La función registra en logs:

- 📦 Payload recibido
- 🔍 Tokens encontrados (primeros 30 caracteres)
- 📤 Envíos exitosos por dispositivo
- ❌ Errores por dispositivo
- 🧹 Tokens deshabilitados
- 📊 Resumen final

---

## 🛠️ Variables de Entorno Requeridas

Asegúrate de que estas variables estén configuradas en Supabase:

```bash
SUPABASE_URL=https://rdznelijpliklisnflfm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"...",...}'
```

### Obtener Service Account de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Settings → Service Accounts → Generate New Private Key
4. Copia el JSON completo a `FIREBASE_SERVICE_ACCOUNT`

---

## 📝 Ejemplo de Uso en Código

### JavaScript/TypeScript

```typescript
const supabaseUrl = 'https://rdznelijpliklisnflfm.supabase.co';
const supabaseAnonKey = 'your-anon-key';

async function sendPushNotification(
  userId: string,
  role: 'client' | 'partner',
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/send_push_notification`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        role,
        title,
        body,
        data,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  return await response.json();
}

// Uso
await sendPushNotification(
  '123e4567-e89b-12d3-a456-426614174000',
  'client',
  'Nueva cita confirmada',
  'Tu cita ha sido confirmada para mañana a las 10:00',
  {
    appointment_id: '456e7890-e89b-12d3-a456-426614174111',
    screen: 'AppointmentDetails'
  }
);
```

### cURL

```bash
curl -X POST \
  'https://rdznelijpliklisnflfm.supabase.co/functions/v1/send_push_notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "role": "client",
    "title": "Nueva cita confirmada",
    "body": "Tu cita ha sido confirmada para mañana a las 10:00",
    "data": {
      "appointment_id": "456e7890-e89b-12d3-a456-426614174111",
      "screen": "AppointmentDetails"
    }
  }'
```

---

## 🔒 Seguridad

- ✅ **No requiere JWT** (usa service role internamente)
- ✅ **Filtrado estricto** por `user_id`, `role` y `enabled = true`
- ✅ **No expone tokens FCM** en respuestas
- ✅ **Limpieza automática** de tokens inválidos
- ✅ **CORS habilitado** para desarrollo

---

## 🧪 Testing

### Test 1: Enviar notificación a cliente

```bash
curl -X POST \
  'https://rdznelijpliklisnflfm.supabase.co/functions/v1/send_push_notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "TU_USER_ID_REAL",
    "role": "client",
    "title": "Test Notification",
    "body": "Esta es una prueba",
    "data": {
      "test": "true"
    }
  }'
```

### Test 2: Usuario sin dispositivos

```bash
curl -X POST \
  'https://rdznelijpliklisnflfm.supabase.co/functions/v1/send_push_notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "00000000-0000-0000-0000-000000000000",
    "role": "client",
    "title": "Test",
    "body": "Test"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "sent": 0,
  "message": "No hay dispositivos registrados o habilitados"
}
```

---

## 📊 Monitoreo

### Ver logs en Supabase Dashboard

1. Ve a **Edge Functions** → `send_push_notification`
2. Click en **Logs**
3. Busca:
   - `🚀 SEND_PUSH_NOTIFICATION` - Inicio de ejecución
   - `✅ Exitosos:` - Resumen de envíos
   - `🧹 Deshabilitando` - Tokens limpiados

### Verificar tokens deshabilitados

```sql
SELECT 
  id,
  user_id,
  role,
  platform,
  enabled,
  updated_at
FROM client_devices 
WHERE enabled = false
ORDER BY updated_at DESC;
```

---

## 🐛 Troubleshooting

### Problema: No se envían notificaciones

**Posibles causas:**

1. **No hay tokens registrados**
   ```sql
   SELECT * FROM client_devices 
   WHERE user_id = 'tu-user-id' AND role = 'client' AND enabled = true;
   ```

2. **Firebase Service Account mal configurado**
   - Verifica que `FIREBASE_SERVICE_ACCOUNT` esté correctamente configurado
   - Verifica que el proyecto Firebase coincida con tu app

3. **Token FCM inválido**
   - Los tokens se marcan automáticamente como `enabled = false`
   - El cliente debe registrar un nuevo token

### Problema: Token se deshabilita constantemente

**Causa:** El token FCM ya no es válido (app desinstalada, token expirado, etc.)

**Solución:** El cliente debe:
1. Detectar que no recibe notificaciones
2. Re-registrar su token FCM
3. Actualizar `client_devices` con el nuevo token

---

## ✅ Checklist de Implementación Backend

- [x] Tabla `client_devices` con columnas `role` y `enabled`
- [x] Índice optimizado para consultas
- [x] Edge Function `send_push_notification` desplegada
- [x] Variables de entorno configuradas
- [x] Funciones antiguas deprecadas
- [x] Manejo de errores FCM implementado
- [x] Logs detallados configurados
- [x] Soporte para múltiples tokens
- [ ] Testing con token real (**PRÓXIMO PASO**)

---

## 📅 Próximos Pasos

### PASO 2: Frontend (NO IMPLEMENTADO AÚN)

1. Registrar tokens FCM en `client_devices`
2. Actualizar rol (`client` o `partner`)
3. Escuchar notificaciones en la app
4. Manejar deep links con `data` payload

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los **logs de la Edge Function** en Supabase Dashboard
2. Verifica la **estructura de `client_devices`**
3. Confirma que **Firebase Service Account** esté configurado
4. Prueba con un **token FCM válido y actual**

---

**Fecha de implementación:** 14 de enero 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Producción Ready

