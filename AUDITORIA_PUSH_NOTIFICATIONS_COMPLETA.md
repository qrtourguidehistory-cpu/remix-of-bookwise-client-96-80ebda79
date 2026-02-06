# 🔍 AUDITORÍA COMPLETA: PUSH NOTIFICATIONS - CLIENTE Y PARTNER

**Fecha:** 2025-02-02  
**Edge Function:** `send-push-notification` (versión 111)

---

## 1. DUPLICADOS: Tokens y Dispositivos por Usuario

### 📊 Resumen de Duplicados

**Usuarios con múltiples dispositivos activos:**
- **Cliente:** 1 usuario con **4 dispositivos activos** (`ef2e21d7-999f-4301-8b05-00b9605f36c0`)
- **Partner:** 3 usuarios con múltiples dispositivos:
  - `3a3e0599-296c-4cb2-8658-e3a095de75d1`: **3 dispositivos activos**
  - `c264fea1-45c1-4b15-8660-99564cfe6af6`: **3 dispositivos activos**
  - `be9bf819-27dc-4104-b104-3bf52eb1db2f`: **2 dispositivos activos**

### 🔴 PROBLEMA CRÍTICO: Tokens FCM Duplicados

**Un mismo token FCM está siendo usado por múltiples usuarios:**

| Token FCM (preview) | Veces Usado | Usuarios Diferentes | Role | Estado |
|---------------------|-------------|---------------------|------|--------|
| `cxCav1NQRhGLXB81rDRatU:APA91bF...` | **8** | **8 usuarios diferentes** | partner | Todos activos |
| `d1t8WyMOSxKqGJmaqxNJ1A:APA91bH...` | 2 | 2 usuarios diferentes | client | Ambos activos |
| `dtE1ZekTTsmy79A-OrmLqn:APA91bG...` | 2 | 2 usuarios diferentes | partner | Ambos activos |
| `eIvh_Rw-SlWVRKf89KfN8A:APA91bH...` | 2 | 2 usuarios diferentes | client | Ambos activos |
| `eKH-VaHtRqKL4fGT2xyj53:APA91bG...` | 2 | 2 usuarios diferentes | client | Ambos activos |

**Impacto:**
- **CRÍTICO:** El token `cxCav1NQRhGLXB81rDRatU` está registrado para **8 usuarios partner diferentes**
- Cuando se envía una notificación a cualquiera de estos usuarios, **se envía a los 8**
- Esto es una **fuga masiva de privacidad**
- **Constraint actual:** Solo existe `UNIQUE (user_id, fcm_token)`, NO hay constraint única en `fcm_token` solo

**Causa probable:**
- El token FCM parece ser un token de desarrollo/testing compartido
- O hay un bug en el registro que permite reutilizar tokens entre usuarios

---

## 2. TOKENS INVÁLIDOS: Errores "Requested entity was not found"

### 📋 Análisis de Logs

**Errores identificados en los logs:**
- `Error enviando notificación a dispositivo 9c1a71bb-b7d7-4132-8c9f-e0a1b702a2fc: Requested entity was not found. messaging/registration-`
- `Error enviando notificación a dispositivo 458ad9be-4d27-43bf-a36e-9d7656460478: Requested entity was not found. messaging/registration-`

**Dispositivos con tokens potencialmente inválidos (sin actualización reciente):**

| Device ID | User ID | Role | Días sin actualizar | App Version |
|-----------|---------|------|---------------------|-------------|
| `55a620d7-e3fa-424f-9752-a487f7a38ace` | `c264fea1-...` | partner | 13.8 días | NULL |
| `b5ca847b-4241-452a-8e2b-78208af335af` | `312039db-...` | partner | 11.7 días | NULL |
| `27707a64-7007-4d51-9a72-c10432ad7416` | `edc0df1a-...` | partner | 11.7 días | NULL |
| `9c1a71bb-b7d7-4132-8c9f-e0a1b702a2fc` | `ef2e21d7-...` | client | Reciente | NULL |

**Clasificación por proyecto:**
- **Cliente:** 1 dispositivo con error confirmado (`9c1a71bb-b7d7-4132-8c9f-e0a1b702a2fc`)
- **Partner:** Múltiples dispositivos con tokens antiguos (13+ días sin actualizar)

**Problemas identificados:**
1. Muchos dispositivos no tienen `app_version` en `device_info` (NULL)
2. Tokens antiguos no se están limpiando automáticamente
3. La Edge Function intenta enviar a tokens inválidos y falla silenciosamente

---

## 3. SECRETOS DE FIREBASE: Configuración y Nombres

### 🔍 Análisis del Código de la Edge Function

**Secretos esperados por la función:**
```typescript
const SECRETS: Record<string, string> = {
  partner: "FIREBASE_SERVICE_ACCOUNT_PARTNER",
  client: "FIREBASE_SERVICE_ACCOUNT_CLIENTE",  // ⚠️ Busca "CLIENTE"
};
```

**Problema identificado en los logs:**
```
[SECRET] Buscando secret: FIREBASE_SERVICE_ACCOUNT_CLIENTE
[SECRET] Secret existe: NO
✔ [SECRET] Encontrado con nombre alternativo: FIREBASE_SERVICE_ACCOUNT_CLIENT
```

**Discrepancia:**
- La función busca `FIREBASE_SERVICE_ACCOUNT_CLIENTE` (con "E")
- El secret real es `FIREBASE_SERVICE_ACCOUNT_CLIENT` (sin "E")
- La función tiene un fallback que busca alternativas, pero esto causa:
  - Logs confusos
  - Posible retraso en la inicialización
  - Riesgo si el secret se renombra

**Recomendación:**
- Actualizar el código para buscar `FIREBASE_SERVICE_ACCOUNT_CLIENT` directamente
- O renombrar el secret a `FIREBASE_SERVICE_ACCOUNT_CLIENTE` para coincidir

---

## 4. FILTRADO POR APP/VERSIÓN: Apps Antiguas

### 📱 Estado Actual

**Problemas identificados:**
1. **100% de dispositivos sin `app_version`:** TODOS los dispositivos (31/31) tienen `device_info->>'appVersion'` = NULL
   - Cliente: 12/12 sin versión
   - Partner: 19/19 sin versión
2. **No hay filtrado por versión:** La Edge Function envía a todos los dispositivos activos sin verificar versión
3. **Tokens antiguos no se limpian:** Dispositivos con 13+ días sin actualizar siguen activos

**Dispositivos potencialmente obsoletos:**
- 20+ dispositivos sin `app_version` registrada
- 7+ dispositivos con más de 10 días sin actualizar
- Todos estos dispositivos siguen recibiendo notificaciones

**Riesgo:**
- Apps antiguas pueden recibir notificaciones con formato incompatible
- Tokens inválidos generan errores en los logs
- Desperdicio de recursos enviando a dispositivos inactivos

---

## 5. RECOMENDACIONES

### 🔴 CRÍTICO: Eliminar Tokens Duplicados

**Problema:** Token `cxCav1NQRhGLXB81rDRatU` usado por 7 usuarios partner.

**Acción inmediata:**
```sql
-- Identificar todos los registros con este token (8 registros encontrados)
SELECT id, user_id, role, fcm_token, created_at, updated_at
FROM public.client_devices
WHERE fcm_token LIKE 'cxCav1NQRhGLXB81rDRatU:APA91b%'
ORDER BY updated_at DESC;

-- OPCIÓN 1: Desactivar todos excepto el más reciente (RECOMENDADO para auditoría)
UPDATE public.client_devices
SET is_active = false
WHERE fcm_token LIKE 'cxCav1NQRhGLXB81rDRatU:APA91b%'
  AND id != (
    SELECT id FROM public.client_devices
    WHERE fcm_token LIKE 'cxCav1NQRhGLXB81rDRatU:APA91b%'
    ORDER BY updated_at DESC
    LIMIT 1
  );

-- OPCIÓN 2: Eliminar todos excepto el más reciente (si se confirma que es token de testing)
-- DELETE FROM public.client_devices
-- WHERE fcm_token LIKE 'cxCav1NQRhGLXB81rDRatU:APA91b%'
--   AND id != (
--     SELECT id FROM public.client_devices
--     WHERE fcm_token LIKE 'cxCav1NQRhGLXB81rDRatU:APA91b%'
--     ORDER BY updated_at DESC
--     LIMIT 1
--   );
```

**Prevención futura:**
- **CRÍTICO:** Agregar constraint única en `fcm_token` (actualmente solo existe `UNIQUE (user_id, fcm_token)`)
  ```sql
  -- Agregar constraint única en fcm_token para prevenir duplicados
  ALTER TABLE public.client_devices
  ADD CONSTRAINT client_devices_fcm_token_unique UNIQUE (fcm_token);
  ```
- Validar en la app cliente que el token no esté ya registrado para otro usuario antes de insertar
- Agregar validación en la Edge Function para detectar y rechazar tokens duplicados

### 🟡 IMPORTANTE: Limpiar Tokens Inválidos Automáticamente

**Problema:** La Edge Function detecta tokens inválidos pero no los limpia consistentemente.

**Solución:**
1. **Mejorar limpieza en Edge Function:**
   - Cuando se detecta error "Requested entity was not found", marcar `is_active = false` en lugar de eliminar
   - Esto permite auditoría y debugging

2. **Agregar job de limpieza periódica:**
```sql
-- Desactivar tokens que no se han actualizado en 30+ días
UPDATE public.client_devices
SET is_active = false
WHERE is_active = true
  AND updated_at < NOW() - INTERVAL '30 days';
```

### 🟡 IMPORTANTE: Corregir Nombre del Secret

**Problema:** Discrepancia entre nombre buscado y nombre real.

**Solución:**
```typescript
// En send-push-notification/index.ts, línea 12
const SECRETS: Record<string, string> = {
  partner: "FIREBASE_SERVICE_ACCOUNT_PARTNER",
  client: "FIREBASE_SERVICE_ACCOUNT_CLIENT",  // ✅ Cambiar de CLIENTE a CLIENT
};
```

### 🟢 RECOMENDADO: Filtrar por Versión de App

**Problema:** No hay filtrado por versión mínima.

**Solución:**
1. **Agregar campo `min_app_version` en notificaciones:**
   - Si una notificación requiere versión mínima, filtrar dispositivos

2. **Agregar validación en Edge Function:**
```typescript
// Filtrar dispositivos por versión mínima si se especifica
if (minAppVersion) {
  devices = devices.filter(device => {
    const deviceVersion = device.device_info?.appVersion;
    if (!deviceVersion) return false; // Sin versión = asumir incompatible
    return compareVersions(deviceVersion, minAppVersion) >= 0;
  });
}
```

3. **Mejorar registro de versión:**
   - Asegurar que todas las apps envíen `app_version` en `device_info`
   - Validar formato de versión (semver)

### 🟢 RECOMENDADO: Mejorar Manejo de Errores

**Problema:** Errores de tokens inválidos no se manejan consistentemente.

**Solución:**
1. **Marcar tokens inválidos en lugar de eliminarlos:**
```typescript
// En lugar de eliminar, marcar como inactivo
await supabase
  .from('client_devices')
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .in('id', invalidTokenIds);
```

2. **Agregar campo `last_error` para debugging:**
```sql
ALTER TABLE public.client_devices
ADD COLUMN last_error TEXT,
ADD COLUMN last_error_at TIMESTAMPTZ;
```

---

## 📊 RESUMEN EJECUTIVO

### Problemas Críticos
1. ✅ **Token duplicado masivo:** 7 usuarios partner comparten el mismo token FCM
2. ✅ **Fuga de privacidad:** Notificaciones se envían a usuarios incorrectos
3. ⚠️ **Tokens inválidos no se limpian:** Dispositivos con errores siguen activos

### Problemas Importantes
1. ⚠️ **Discrepancia en nombres de secrets:** `CLIENTE` vs `CLIENT`
2. ⚠️ **No hay filtrado por versión:** Apps antiguas reciben notificaciones
3. ⚠️ **Falta `app_version`:** Muchos dispositivos sin información de versión

### Acciones Requeridas (Prioridad)
1. **URGENTE:** Eliminar/desactivar tokens duplicados
2. **URGENTE:** Agregar constraint única en `fcm_token`
3. **ALTA:** Corregir nombre del secret en código
4. **MEDIA:** Implementar limpieza automática de tokens inválidos
5. **MEDIA:** Agregar filtrado por versión de app
6. **BAJA:** Mejorar logging y debugging

---

**Fin del informe**

