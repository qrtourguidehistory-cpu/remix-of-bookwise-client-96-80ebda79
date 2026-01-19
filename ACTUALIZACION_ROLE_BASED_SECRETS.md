# ✅ ACTUALIZACIÓN: Role-Based Firebase Service Accounts

## 📋 RESUMEN DE CAMBIOS

**Fecha:** 26 de Enero 2026  
**Función:** `send-push-notification`  
**Cambio:** Soporte para múltiples Firebase Service Accounts según el rol del usuario

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. Lectura del Campo `role` del Payload

**Línea 174:**
```typescript
const { user_id, title, body, data, notification_id, role } = await req.json();
```

**Cambio:** Ahora lee el campo `role` directamente del payload del request.

---

### 2. Selección del Secret Según el Rol

**Líneas 186-190:**
```typescript
// Determine which Firebase service account to use based on role
const isPartner = role === 'partner';
const serviceAccountSecretName = isPartner 
  ? 'FIREBASE_SERVICE_ACCOUNT_PARTNER' 
  : 'FIREBASE_SERVICE_ACCOUNT_CLIENT';
```

**Lógica:**
- Si `role === 'partner'` → Usa `FIREBASE_SERVICE_ACCOUNT_PARTNER`
- Cualquier otro caso (incluyendo `undefined`, `null`, `'client'`) → Usa `FIREBASE_SERVICE_ACCOUNT_CLIENT`

---

### 3. Uso del `project_id` Correcto

**Líneas 207-212:**
```typescript
const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
console.log('📬 Firebase project:', serviceAccount.project_id);
console.log('📬 Firebase project ID from service account:', serviceAccount.project_id);

// Use the project_id from the correct Service Account (already determined by role)
const firebaseProjectId = serviceAccount.project_id;
```

**Cambio:** El `project_id` se toma directamente del Service Account JSON correcto según el rol.

**Línea 244-250 (en sendFCMMessage):**
```typescript
const result = await sendFCMMessage(
  device.fcm_token,
  title,
  body,
  firebaseProjectId, // Uses project_id from the correct Service Account based on role
  accessToken
);
```

**Validación:** El `project_id` usado en la URL de FCM es el del Service Account correcto:
- `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`

---

### 4. Determinación de la Tabla por Rol

**Líneas 214-218:**
```typescript
// Determine user type from request (role takes precedence over data.user_type)
// This determines which table to query for FCM tokens
const user_type = role || data?.user_type || 'client';
const isPartnerUser = user_type === 'partner';
const tableName = isPartnerUser ? 'partner_devices' : 'client_devices';
```

**Prioridad:**
1. `role` (del payload principal) - **MÁXIMA PRIORIDAD**
2. `data?.user_type` (del objeto `data` del payload) - **PRIORIDAD MEDIA**
3. `'client'` (default) - **FALLBACK**

---

## 📊 FLUJO COMPLETO

### Flujo para Usuario `role === 'partner'`:

1. **Request llega con `role: 'partner'`**
2. **Selección de Secret:** Usa `FIREBASE_SERVICE_ACCOUNT_PARTNER`
3. **Parse del Service Account:** Obtiene el Service Account JSON del Partner
4. **Project ID:** Usa `project_id` del Service Account Partner
5. **Tabla:** Consulta `partner_devices` para obtener tokens FCM
6. **Envío FCM:** Usa `project_id` del Partner en la URL de Google FCM

### Flujo para Usuario `role !== 'partner'` (default: client):

1. **Request llega sin `role` o con `role: 'client'`**
2. **Selección de Secret:** Usa `FIREBASE_SERVICE_ACCOUNT_CLIENT`
3. **Parse del Service Account:** Obtiene el Service Account JSON del Client
4. **Project ID:** Usa `project_id` del Service Account Client
5. **Tabla:** Consulta `client_devices` para obtener tokens FCM
6. **Envío FCM:** Usa `project_id` del Client en la URL de Google FCM

---

## 🔍 VALIDACIONES

### ✅ Validación de Secrets:

**Líneas 195-205:**
```typescript
const serviceAccountJson = Deno.env.get(serviceAccountSecretName);
if (!serviceAccountJson) {
  console.error(`❌ ${serviceAccountSecretName} not configured`);
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: `Firebase service account not configured for role: ${role || 'client'}. Please configure ${serviceAccountSecretName}.` 
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Mensaje de Error Mejorado:** Ahora indica específicamente qué secret falta según el rol.

---

## 📋 SECRETS REQUERIDOS EN SUPABASE

| Secret | Rol | Estado |
|--------|-----|--------|
| `FIREBASE_SERVICE_ACCOUNT_PARTNER` | `role === 'partner'` | ✅ Debe estar configurado |
| `FIREBASE_SERVICE_ACCOUNT_CLIENT` | Cualquier otro caso | ✅ Debe estar configurado |

---

## 🔄 COMPATIBILIDAD HACIA ATRÁS

### Request con `role` (NUEVO):

```json
{
  "user_id": "uuid",
  "title": "Título",
  "body": "Mensaje",
  "role": "partner"  // o "client" o undefined
}
```

### Request sin `role` (COMPATIBLE):

```json
{
  "user_id": "uuid",
  "title": "Título",
  "body": "Mensaje",
  "data": {
    "user_type": "client"  // Fallback a data.user_type
  }
}
```

**Comportamiento:** Si no hay `role`, usa `data?.user_type` o `'client'` por defecto.

---

## ✅ LOGS MEJORADOS

**Nuevos logs agregados:**
- `📬 User role: {role}` - Muestra el rol detectado
- `📬 Using Firebase service account: {secretName}` - Muestra qué secret se está usando
- `📬 Firebase project ID from service account: {project_id}` - Confirma el project_id usado
- `📬 User type determined: {user_type}` - Muestra el user_type final
- `📬 Using table: {tableName}` - Confirma la tabla consultada

---

## 🎯 EJEMPLO DE USO

### Para enviar notificación a Partner:

```typescript
await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: 'partner-uuid',
    title: 'Nueva cita',
    body: 'Tienes una nueva cita programada',
    role: 'partner'  // ← Usará FIREBASE_SERVICE_ACCOUNT_PARTNER
  }
});
```

### Para enviar notificación a Client:

```typescript
await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: 'client-uuid',
    title: 'Recordatorio',
    body: 'Tu cita es mañana',
    role: 'client'  // ← Usará FIREBASE_SERVICE_ACCOUNT_CLIENT
    // o simplemente omitir role
  }
});
```

---

## ✅ ESTADO FINAL

- ✅ Lee el campo `role` del payload
- ✅ Selecciona el secret correcto según el rol
- ✅ Usa el `project_id` del Service Account correcto
- ✅ Consulta la tabla correcta (`partner_devices` o `client_devices`)
- ✅ Envía notificaciones FCM con el `project_id` correcto
- ✅ Mantiene compatibilidad hacia atrás con `data.user_type`
- ✅ Logs mejorados para debugging

---

**Estado:** ✅ **IMPLEMENTACIÓN COMPLETA**

La función ahora soporta múltiples Firebase Service Accounts y selecciona automáticamente el correcto según el rol del usuario.



