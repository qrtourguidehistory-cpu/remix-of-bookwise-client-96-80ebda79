# 🔍 AUDITORÍA: APP CLIENTE - PUSH NOTIFICATIONS

**Fecha:** 2025-01-27  
**Objetivo:** Determinar si la app cliente contribuye al bug de privacidad en push notifications

---

## ✅ VEREDICTO: **PARCIALMENTE CULPABLE**

La app cliente tiene **1 bug crítico** y **3 problemas de diseño** que pueden contribuir al envío de notificaciones a usuarios incorrectos.

---

## 🔴 BUG CRÍTICO #1: NO SE ENVÍA `role` EN LOS UPSERTS

**Ubicación:** 3 archivos diferentes
- `src/hooks/useFCMNotifications.ts` (línea 65-77)
- `src/utils/fcm.ts` (línea 64-76)
- `src/utils/pushNotifications.ts` (línea 65-76)

**Problema:**
```typescript
// ❌ ACTUAL: No incluye role
.upsert({
  user_id: currentUserId,
  fcm_token: token,
  platform: 'android',
  is_active: true,
  // ❌ FALTA: role
})
```

**Impacto:**
- Los registros en `client_devices` pueden quedar con `role = NULL`
- La Edge Function busca dispositivos con `role = 'client'` o `role = 'partner'`
- Si `role` es NULL, esos dispositivos **NO se encontrarán** en las consultas
- **PERO**: Si la migración reciente actualiza los registros existentes, los nuevos sin `role` quedarán huérfanos

**Riesgo:** 🔴 **ALTO** - Puede causar que dispositivos no reciban notificaciones o que se usen dispositivos incorrectos si hay fallbacks en la Edge Function.

---

## 🟡 PROBLEMA #2: MÚLTIPLES IMPLEMENTACIONES DEL MISMO UPSERT

**Ubicación:** 3 archivos diferentes hacen el mismo upsert con ligeras variaciones

**Problema:**
- `useFCMNotifications.ts` usa `onConflict: 'client_devices_user_token_unique'`
- `fcm.ts` usa `onConflict: 'user_id,fcm_token'`
- `pushNotifications.ts` usa `onConflict: 'user_id,fcm_token'`

**Impacto:**
- Código duplicado = riesgo de inconsistencias
- Si se actualiza uno, hay que actualizar los otros 2
- Ya se olvidó agregar `role` en los 3 lugares

**Riesgo:** 🟡 **MEDIO** - Mantenibilidad y riesgo de bugs futuros.

---

## 🟡 PROBLEMA #3: NO SE VALIDA QUE `userId` COINCIDA CON `session.user.id`

**Ubicación:** Todos los archivos de registro

**Problema:**
```typescript
// Se verifica que hay sesión
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;

// ❌ PERO: No se valida que userId === session.user.id
.upsert({
  user_id: currentUserId, // Puede ser diferente a session.user.id
  ...
})
```

**Impacto:**
- Si `userId` viene de props/estado y no coincide con la sesión activa, se podría registrar un token con `user_id` incorrecto
- RLS debería prevenir esto, pero es mejor validar explícitamente

**Riesgo:** 🟡 **MEDIO** - RLS protege, pero es una validación faltante.

---

## 🟢 LO QUE SÍ FUNCIONA BIEN

### ✅ Logout limpia correctamente
- `AuthContext.tsx` (línea 289-291) desactiva todos los tokens del usuario con `is_active = false`
- Se ejecuta antes de `signOut()`

### ✅ Se verifica sesión antes de insertar
- Todos los lugares verifican `session` antes de hacer upsert
- Si no hay sesión, no se inserta

### ✅ Constraint única previene duplicados
- `UNIQUE (user_id, fcm_token)` previene tokens duplicados por usuario
- UPSERT actualiza en lugar de crear duplicados

### ✅ Se activa `is_active = true` al registrar
- Todos los upserts incluyen `is_active: true`

---

## 📊 RESUMEN DE RIESGOS

| Problema | Severidad | Probabilidad | Impacto |
|----------|-----------|--------------|---------|
| Falta `role` en upserts | 🔴 ALTA | 🔴 ALTA | Dispositivos sin role no se encuentran en consultas |
| Múltiples implementaciones | 🟡 MEDIA | 🟡 MEDIA | Inconsistencias y bugs futuros |
| No valida userId vs session | 🟡 MEDIA | 🟢 BAJA | RLS protege, pero falta validación |

---

## 🎯 CONCLUSIÓN

**La app cliente ES parcialmente culpable** del problema de privacidad:

1. **Bug crítico:** No envía `role` en los upserts, lo que puede dejar dispositivos sin role y causar que no se encuentren o se usen dispositivos incorrectos.

2. **Problemas de diseño:** Código duplicado y falta de validaciones explícitas aumentan el riesgo de bugs.

3. **Lo que funciona:** Logout limpia correctamente, se verifica sesión, y hay constraints que previenen duplicados.

---

## 🔧 ACCIONES REQUERIDAS (NO IMPLEMENTADAS - SOLO IDENTIFICADAS)

1. **CRÍTICO:** Agregar `role: 'client'` en todos los upserts (3 lugares)
2. **IMPORTANTE:** Consolidar el código de registro en un solo lugar
3. **RECOMENDADO:** Validar que `userId === session.user.id` antes de insertar

---

**Fin del informe**

