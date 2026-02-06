# 🔍 AUDITORÍA PASIVA: SISTEMA DE PUSH NOTIFICATIONS

**Fecha:** 2025-02-02  
**Tipo:** Auditoría pasiva (sin modificaciones)  
**Objetivo:** Diagnóstico completo del estado actual del sistema

---

## 1️⃣ EDGE FUNCTIONS

### ✅ Edge Functions Existentes

| Slug | Nombre | Versión | JWT | Estado | Propósito |
|------|--------|---------|-----|--------|-----------|
| `send-push-notification` | send-push-notification | 111 | ❌ No | ACTIVE | **Principal:** Envía notificaciones push usando Firebase Admin SDK |
| `send-fcm-notification` | send-fcm-notification | 55 | ❌ No | ACTIVE | **Alternativa:** Envía FCM usando HTTP v1 API (implementación diferente) |
| `notify-next-client` | notify-next-client | 45 | ✅ Sí | ACTIVE | Notifica al siguiente cliente cuando una cita inicia |
| `invite-client-early` | invite-client-early | 45 | ✅ Sí | ACTIVE | Invita a cliente a llegar temprano |
| `send-early-arrival-request` | send-early-arrival-request | 45 | ✅ Sí | ACTIVE | Envía solicitud de llegada temprana |
| `notify-partner` | notify-partner | 44 | ❌ No | ACTIVE | **OBSOLETO:** Notifica a partner (probablemente usa send-push-notification internamente) |
| `get-google-maps-key` | get-google-maps-key | 86 | ✅ Sí | ACTIVE | Obtiene clave de Google Maps |
| `scheduled-cleanup` | scheduled-cleanup | 4 | ❌ No | ACTIVE | Limpieza programada |

### ⚠️ Edge Functions que Envían Push Notifications

**1. `send-push-notification` (PRINCIPAL)**
- **Tecnología:** Firebase Admin SDK (`firebase-admin@11.0.0`)
- **Método:** `admin.messaging().send()`
- **Tabla consultada:** `client_devices` (unificada para client y partner)
- **Filtros:** `user_id`, `role`, `is_active = true`
- **Secrets usados:**
  - `FIREBASE_SERVICE_ACCOUNT_CLIENTE` (busca primero, luego fallback a `FIREBASE_SERVICE_ACCOUNT_CLIENT`)
  - `FIREBASE_SERVICE_ACCOUNT_PARTNER`
- **Manejo de errores:** Marca tokens inválidos pero no los limpia automáticamente
- **Envío:** Individual (no batch)

**2. `send-fcm-notification` (ALTERNATIVA)**
- **Tecnología:** HTTP v1 API directa (sin Firebase Admin SDK)
- **Método:** `fetch()` a `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`
- **Tabla consultada:** `client_devices` O `partner_devices` (según `user_type`)
- **⚠️ PROBLEMA:** Busca `partner_devices` que **NO EXISTE** (solo existe `client_devices`)
- **Secrets usados:**
  - `FIREBASE_SERVICE_ACCOUNT_CLIENT`
  - `FIREBASE_SERVICE_ACCOUNT_PARTNER`
- **Manejo de errores:** Elimina tokens inválidos directamente
- **Envío:** Individual (no batch)

### ❌ Referencias a Edge Functions Obsoletas

**En código SQL:**
- Múltiples funciones SQL antiguas aún referencian `send-push-notification` (correcto)
- Algunas funciones antiguas (`fn_notify_partner_*`) tienen URLs hardcodeadas incorrectas

**En código frontend:**
- `src/lib/clientNotificationService.ts` → Llama a `send-push-notification` ✅
- `src/lib/partnerNotificationService.ts` → Llama a `send-push-notification` ✅

### 🔗 Dependencias entre Edge Functions

```
send-push-notification (principal)
  ├── Usado por: call_send_push_notification() (SQL)
  ├── Usado por: clientNotificationService.ts
  ├── Usado por: partnerNotificationService.ts
  └── Usado por: Triggers SQL (send_push_on_*)

send-fcm-notification (alternativa)
  └── ⚠️ NO se usa actualmente (código obsoleto)
```

---

## 2️⃣ FIREBASE / FCM

### ✅ Inicialización de Firebase

**Edge Function `send-push-notification`:**
- Usa Firebase Admin SDK
- Inicializa apps separadas por role: `app-partner` y `app-client`
- Evita colisiones usando nombres únicos
- Obtiene access token usando Service Account JWT

**Edge Function `send-fcm-notification`:**
- NO usa Firebase Admin SDK
- Genera JWT manualmente usando Web Crypto API
- Intercambia JWT por access token vía OAuth2
- Usa HTTP v1 API directamente

### ⚠️ Helpers Compartidos

**NO hay helpers compartidos:**
- Cada Edge Function tiene su propia implementación
- `send-push-notification` usa Firebase Admin SDK
- `send-fcm-notification` usa HTTP v1 API manual
- **Duplicación de código:** Lógica de autenticación duplicada

### 📤 Envío: Batch vs Individual

**Ambas Edge Functions envían individualmente:**
- `send-push-notification`: Loop `for` sobre dispositivos
- `send-fcm-notification`: Loop `for` sobre dispositivos
- **No hay envío batch:** Cada token se envía en una request separada

### ❌ Manejo de Errores por Token

**`send-push-notification`:**
- Detecta errores "UNREGISTERED" o "INVALID_ARGUMENT"
- Marca tokens como inválidos en array `invalidTokenIds`
- **NO limpia automáticamente:** Solo loguea el error
- **Código comentado:** Hay código para limpiar pero no se ejecuta

**`send-fcm-notification`:**
- Detecta errores similares
- **SÍ limpia automáticamente:** Elimina tokens inválidos de la BD
- Usa `DELETE` en lugar de marcar `is_active = false`

---

## 3️⃣ BASE DE DATOS – DISPOSITIVOS

### ✅ Tabla `client_devices`

**Estructura completa:**

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | - | FK a `auth.users(id)` ON DELETE CASCADE |
| `fcm_token` | text | NO | - | Token FCM del dispositivo |
| `platform` | text | NO | - | 'android', 'ios', o 'web' (CHECK constraint) |
| `device_info` | jsonb | YES | `'{}'::jsonb` | Información adicional del dispositivo |
| `created_at` | timestamptz | YES | `now()` | Fecha de creación |
| `updated_at` | timestamptz | YES | `now()` | Última actualización |
| `role` | text | NO | `'client'` | 'client' o 'partner' (CHECK constraint) |
| `enabled` | boolean | NO | `true` | **OBSOLETO:** Campo legacy |
| `is_active` | boolean | NO | `true` | **ACTIVO:** Controla si el dispositivo recibe notificaciones |

### ⚠️ Constraints

**Constraints existentes:**
1. `client_devices_pkey` → PRIMARY KEY (`id`)
2. `client_devices_user_id_fcm_token_key` → UNIQUE (`user_id`, `fcm_token`)
3. `client_devices_user_id_fkey` → FOREIGN KEY (`user_id`) REFERENCES `auth.users(id)` ON DELETE CASCADE
4. `client_devices_platform_check` → CHECK (`platform` IN ('android', 'ios', 'web'))
5. `client_devices_role_check` → CHECK (`role` IN ('client', 'partner'))

**❌ PROBLEMA CRÍTICO:**
- **NO existe constraint única en `fcm_token` solo**
- Permite que el mismo token FCM sea usado por múltiples usuarios
- **Evidencia:** Token `cxCav1NQRhGLXB81rDRatU` usado por 8 usuarios diferentes

### ✅ Índices

**Índices existentes:**
1. `client_devices_pkey` → PRIMARY KEY index
2. `client_devices_user_id_fcm_token_key` → UNIQUE index
3. `idx_client_devices_user_id` → Simple index en `user_id`
4. `idx_client_devices_role` → Simple index en `role`
5. `idx_client_devices_is_active` → Partial index en `is_active` WHERE `is_active = true`
6. `idx_client_devices_user_role_active` → Composite partial index en `(user_id, role, is_active)` WHERE `is_active = true`
7. `idx_client_devices_user_role_enabled` → **OBSOLETO:** Index en `enabled` (campo legacy)

### ⚠️ Campos Obsoletos

**`enabled` (boolean):**
- Campo legacy que ya no se usa
- Todavía tiene índice: `idx_client_devices_user_role_enabled`
- **Recomendación:** Eliminar campo e índice en migración futura

### 🔗 Eliminación/Desactivación de Tokens

**Métodos actuales:**

1. **Logout (AuthContext.tsx):**
   ```typescript
   // Desactiva todos los tokens del usuario
   UPDATE client_devices SET is_active = false WHERE user_id = ?
   ```

2. **Edge Function `send-fcm-notification`:**
   ```typescript
   // Elimina tokens inválidos
   DELETE FROM client_devices WHERE id IN (invalidTokenIds)
   ```

3. **Edge Function `send-push-notification`:**
   ```typescript
   // Detecta tokens inválidos pero NO los limpia
   // Código comentado para limpiar existe pero no se ejecuta
   ```

**❌ PROBLEMA:**
- No hay limpieza automática de tokens antiguos
- No hay limpieza de tokens inválidos en `send-push-notification`
- Tokens con 13+ días sin actualizar siguen activos

### ❌ Tabla `partner_devices` (NO EXISTE)

**Evidencia:**
- `send-fcm-notification` busca `partner_devices` cuando `user_type = 'partner'`
- La tabla **NO EXISTE** en la base de datos
- Solo existe `client_devices` (unificada)
- **Causa de errores:** `send-fcm-notification` fallará para partners

---

## 4️⃣ SQL TRIGGERS

### ✅ Triggers Relacionados con Appointments

| Trigger | Tabla | Evento | Función | Propósito |
|---------|-------|--------|---------|-----------|
| `on_appointment_created` | `appointments` | INSERT | `notify_partner_safe()` | Notifica partner cuando se crea cita |
| `tr_push_new_appointment` | `appointments` | INSERT | `fn_notify_partner_v13()` | **DUPLICADO:** También notifica partner |
| `trigger_notify_new_appointment` | `appointments` | INSERT | `notify_partner_new_appointment()` | **DUPLICADO:** También notifica partner |
| `trigger_handle_appointment_confirmation` | `appointments` | UPDATE | `handle_appointment_confirmation()` | Maneja confirmación de cita |
| `trigger_handle_appointment_completion` | `appointments` | UPDATE | `handle_appointment_completion()` | Maneja completación de cita |
| `trigger_notify_next_client_on_started` | `appointments` | UPDATE | `notify_next_client_on_started()` | Notifica siguiente cliente cuando cita inicia |

### ⚠️ Triggers Relacionados con Notificaciones

| Trigger | Tabla | Evento | Función | Propósito |
|---------|-------|--------|---------|-----------|
| `trigger_send_push_on_appointment_notification` | `appointment_notifications` | INSERT | `send_push_on_appointment_notification()` | Envía push cuando se crea notificación de cita |
| `send_push_realtime_partner` | `appointment_notifications` | INSERT | `supabase_functions.http_request()` | **OBSOLETO:** Usa función directa en lugar de `call_send_push_notification()` |
| `trigger_send_push_on_client_notification` | `client_notifications` | INSERT | `send_push_on_client_notification()` | Envía push cuando se crea notificación de cliente |
| `trigger_send_push_notification` | `client_notifications` | INSERT | `send_push_on_notification()` | **DUPLICADO:** También envía push |

### ❌ Problemas de Duplicación

**1. Múltiples triggers en `appointments` INSERT:**
- `on_appointment_created` → `notify_partner_safe()`
- `tr_push_new_appointment` → `fn_notify_partner_v13()`
- `trigger_notify_new_appointment` → `notify_partner_new_appointment()`
- **Resultado:** Una cita nueva puede disparar 3 notificaciones al partner

**2. Múltiples triggers en `client_notifications` INSERT:**
- `trigger_send_push_on_client_notification` → `send_push_on_client_notification()`
- `trigger_send_push_notification` → `send_push_on_notification()`
- **Resultado:** Una notificación de cliente puede disparar 2 push notifications

### 🔗 Funciones SQL que Llaman Edge Functions

**Función principal:**
- `call_send_push_notification()` → Llama a `send-push-notification` vía `pg_net.http_post()`
- **Usada por:** Todos los triggers modernos

**Funciones obsoletas (aún existen pero no se usan):**
- `fn_notify_partner_*` (varias versiones) → Tienen URLs hardcodeadas incorrectas
- `fn_auto_push_on_appointment` → URL incorrecta
- `notify_client_on_confirmation` → URL hardcodeada con JWT expirado
- `send_push_on_notification` → Usa extensión `http` obsoleta

### ⚠️ Posibilidad de Disparos Múltiples

**Sí, hay riesgo de disparos múltiples:**

1. **Appointments INSERT:**
   - 3 triggers diferentes pueden dispararse
   - Cada uno llama a `call_send_push_notification()` o funciones obsoletas
   - **Resultado:** Partner puede recibir 3 notificaciones por cita nueva

2. **Client Notifications INSERT:**
   - 2 triggers diferentes pueden dispararse
   - Cada uno llama a `call_send_push_notification()`
   - **Resultado:** Cliente puede recibir 2 notificaciones duplicadas

---

## 5️⃣ FRONTEND (CLIENTE / PARTNER)

### ✅ Registro de FCM Token (Cliente)

**Ubicación única:**
- `src/hooks/useFCMNotifications.ts` → Hook `useFCMNotifications()`
- Función `registerToken()` → Hace UPSERT en `client_devices`

**Cuándo se llama:**
1. **Al recibir token FCM:** Listener `registration` llama a `registerToken()`
2. **Cuando cambia el token:** `useEffect` detecta cambio y re-registra
3. **Al cambiar userId:** `useEffect` detecta cambio y re-registra

**Cuántas veces se llama:**
- **Mínimo:** 1 vez por token FCM recibido
- **Máximo:** Puede llamarse múltiples veces si:
  - El token FCM cambia
  - El `userId` cambia
  - El hook se re-monta

**Validaciones:**
- ✅ Verifica sesión activa antes de registrar
- ✅ Verifica que `userId === session.user.id`
- ✅ Verifica que `userId` no sea null/vacío
- ✅ Incluye `role: 'client'` en el UPSERT

### ⚠️ Listeners Duplicados

**Protección existente:**
- `listenersRegistered.current` previene registro múltiple
- **PERO:** Si el hook se desmonta y remonta, puede registrar listeners de nuevo
- **PERO:** Si `userId` cambia, se resetean flags y puede registrar de nuevo

**Riesgo:**
- Si el componente se monta/desmonta múltiples veces, puede haber listeners duplicados
- Cada listener puede llamar a `registerToken()` cuando recibe token

### ❌ Llamadas Automáticas al Backend

**NO hay llamadas automáticas:**
- El frontend NO llama directamente a Edge Functions
- Solo registra tokens en `client_devices`
- Los triggers SQL son los que llaman a Edge Functions

**Servicios de notificación (NO se usan para registro):**
- `src/lib/clientNotificationService.ts` → Solo para enviar notificaciones manuales
- `src/lib/partnerNotificationService.ts` → Solo para enviar notificaciones manuales

### ❌ Frontend Partner

**NO existe código de frontend partner en este repositorio:**
- Solo existe código de cliente
- Partner probablemente tiene su propio repositorio/proyecto
- **Implicación:** No se puede auditar el registro de tokens de partner desde aquí

---

## 📊 RESUMEN EJECUTIVO

### ✅ Qué Existe

1. **Edge Function principal:** `send-push-notification` (versión 111) - ACTIVA
2. **Edge Function alternativa:** `send-fcm-notification` (versión 55) - ACTIVA pero OBSOLETA
3. **Tabla unificada:** `client_devices` con `role` para client y partner
4. **Función SQL:** `call_send_push_notification()` - Usada por triggers
5. **Hook frontend:** `useFCMNotifications` - Registra tokens correctamente
6. **Validaciones:** Múltiples validaciones en SQL y frontend

### ⚠️ Qué Puede Causar Duplicados

1. **Tokens FCM duplicados:**
   - NO hay constraint única en `fcm_token` solo
   - Mismo token puede usarse por múltiples usuarios
   - **Evidencia:** 8 usuarios comparten un token

2. **Triggers duplicados:**
   - 3 triggers en `appointments` INSERT → 3 notificaciones al partner
   - 2 triggers en `client_notifications` INSERT → 2 notificaciones al cliente

3. **Listeners duplicados:**
   - Si hook se remonta, puede registrar listeners múltiples veces
   - Cada listener puede registrar el mismo token

4. **Re-registro de tokens:**
   - `useEffect` re-registra token cuando cambia
   - Puede causar múltiples UPSERTs del mismo token

### ❌ Qué Está Obsoleto o Peligroso

1. **Edge Function `send-fcm-notification`:**
   - Busca tabla `partner_devices` que NO EXISTE
   - Implementación diferente (HTTP v1 manual vs Admin SDK)
   - **Recomendación:** Eliminar o actualizar

2. **Campo `enabled` en `client_devices`:**
   - Campo legacy que ya no se usa
   - Tiene índice obsoleto
   - **Recomendación:** Eliminar en migración

3. **Funciones SQL obsoletas:**
   - `fn_notify_partner_*` (varias versiones)
   - `notify_client_on_confirmation` (JWT hardcodeado expirado)
   - `send_push_on_notification` (usa extensión `http` obsoleta)
   - **Recomendación:** Eliminar funciones no usadas

4. **Triggers obsoletos:**
   - `send_push_realtime_partner` (usa función directa)
   - `trigger_send_push_notification` (duplicado)
   - **Recomendación:** Eliminar triggers duplicados

5. **Secreto con nombre incorrecto:**
   - Código busca `FIREBASE_SERVICE_ACCOUNT_CLIENTE` (con "E")
   - Secret real es `FIREBASE_SERVICE_ACCOUNT_CLIENT` (sin "E")
   - Funciona por fallback pero genera logs confusos
   - **Recomendación:** Corregir nombre en código

### 🔗 Qué Depende de Qué

```
Frontend (Cliente)
  └── useFCMNotifications hook
      └── registerToken()
          └── UPSERT client_devices (role='client')

SQL Triggers
  ├── appointments INSERT
  │   ├── on_appointment_created → notify_partner_safe()
  │   ├── tr_push_new_appointment → fn_notify_partner_v13()
  │   └── trigger_notify_new_appointment → notify_partner_new_appointment()
  │
  ├── appointment_notifications INSERT
  │   └── trigger_send_push_on_appointment_notification → send_push_on_appointment_notification()
  │       └── call_send_push_notification()
  │
  └── client_notifications INSERT
      ├── trigger_send_push_on_client_notification → send_push_on_client_notification()
      │   └── call_send_push_notification()
      └── trigger_send_push_notification → send_push_on_notification() [OBSOLETO]

call_send_push_notification()
  └── pg_net.http_post()
      └── send-push-notification Edge Function
          └── Firebase Admin SDK
              └── FCM API
```

### 📌 Recomendaciones (Sin Implementar)

#### 🔴 CRÍTICO

1. **Agregar constraint única en `fcm_token`:**
   ```sql
   ALTER TABLE client_devices
   ADD CONSTRAINT client_devices_fcm_token_unique UNIQUE (fcm_token);
   ```

2. **Eliminar triggers duplicados:**
   - Mantener solo 1 trigger por evento
   - Eliminar `tr_push_new_appointment` y `trigger_notify_new_appointment`
   - Eliminar `trigger_send_push_notification`

3. **Desactivar/eliminar `send-fcm-notification`:**
   - Busca tabla inexistente
   - Código obsoleto

#### 🟡 IMPORTANTE

4. **Corregir nombre de secret:**
   - Cambiar `FIREBASE_SERVICE_ACCOUNT_CLIENTE` → `FIREBASE_SERVICE_ACCOUNT_CLIENT`

5. **Implementar limpieza automática:**
   - Limpiar tokens inválidos en `send-push-notification`
   - Agregar job para limpiar tokens antiguos (30+ días)

6. **Eliminar campo `enabled`:**
   - Migración para eliminar campo e índice obsoleto

#### 🟢 RECOMENDADO

7. **Consolidar Edge Functions:**
   - Usar solo `send-push-notification`
   - Eliminar `send-fcm-notification`

8. **Mejorar manejo de errores:**
   - Marcar `is_active = false` en lugar de eliminar
   - Agregar campo `last_error` para debugging

9. **Agregar registro de versión:**
   - Asegurar que todas las apps envíen `app_version` en `device_info`
   - Implementar filtrado por versión mínima

10. **Documentar dependencias:**
    - Crear diagrama de flujo completo
    - Documentar qué triggers llaman qué funciones

---

**Fin de la auditoría pasiva**

