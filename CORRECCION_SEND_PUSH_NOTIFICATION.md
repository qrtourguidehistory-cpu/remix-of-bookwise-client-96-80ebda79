# ✅ CORRECCIÓN: Edge Function send-push-notification

## 🐛 PROBLEMA IDENTIFICADO

**Error en logs:**
```
Error fetching subscriptions: { 
  code: "PGRST265", 
  hint: "Perhaps you meant the table 'public.notifications'", 
  message: "relation \"public.push_subscriptions\" does not exist"
}
```

**Causa:** La función `send-push-notification` estaba buscando en la tabla `push_subscriptions` que **NO EXISTE**.

---

## ✅ SOLUCIÓN APLICADA

### Cambio Realizado:

**Archivo:** `supabase/functions/send-push-notification/index.ts`

**Antes (❌ INCORRECTO):**
```typescript
// Buscaba en tabla inexistente
const { data: subscriptions } = await supabase
  .from('push_subscriptions')  // ❌ Esta tabla no existe
  .select('*')
  .eq('user_id', user_id);
```

**Después (✅ CORREGIDO):**
```typescript
// Ahora busca en client_devices o partner_devices (tablas que SÍ existen)
const user_type = data?.user_type || 'client';
const tableName = user_type === 'partner' ? 'partner_devices' : 'client_devices';

const { data: devices } = await supabase
  .from(tableName)  // ✅ Usa client_devices o partner_devices
  .select('id, fcm_token, platform')
  .eq('user_id', user_id);
```

---

## ⚠️ IMPORTANTE: FUNCIONALIDAD LIMITADA

**Nota:** La función `send-push-notification` ahora obtiene los tokens correctamente, pero **NO envía notificaciones FCM** todavía.

### ¿Por qué?

Hay **DOS funciones diferentes**:
1. `send-push-notification` - Originalmente para Web Push (PWA)
2. `send-fcm-notification` - Implementada correctamente para FCM (Android/iOS)

### Recomendación:

**Para notificaciones FCM en Android/iOS, usa `send-fcm-notification`:**

```typescript
// En lugar de llamar a send-push-notification
// Llama directamente a send-fcm-notification
await supabase.functions.invoke('send-fcm-notification', {
  body: {
    user_id: userId,
    user_type: 'client',  // o 'partner'
    title: 'Título',
    body: 'Mensaje'
  }
});
```

---

## 🔄 PRÓXIMOS PASOS RECOMENDADOS

### Opción 1: Usar `send-fcm-notification` (RECOMENDADO)

Actualizar todos los lugares donde se llama a `send-push-notification` para usar `send-fcm-notification` en su lugar:

```typescript
// Buscar en triggers de Supabase y Edge Functions
// Cambiar de:
supabase.functions.invoke('send-push-notification', {...})

// A:
supabase.functions.invoke('send-fcm-notification', {
  body: {
    user_id: ...,
    user_type: 'client',
    title: ...,
    body: ...
  }
});
```

### Opción 2: Implementar FCM en `send-push-notification`

Si se prefiere mantener `send-push-notification` como función principal, copiar la implementación FCM de `send-fcm-notification` a `send-push-notification`.

---

## 📋 VERIFICACIÓN

**Antes:**
- ❌ Error: `relation "public.push_subscriptions" does not exist`
- ❌ Notificaciones no funcionaban

**Después:**
- ✅ No más errores de tabla inexistente
- ✅ La función obtiene tokens de `client_devices` correctamente
- ⚠️ Pero retorna mensaje indicando que debe usarse `send-fcm-notification`

---

## ✅ ESTADO

- ✅ Error de tabla inexistente corregido
- ✅ La función ahora obtiene tokens de `client_devices`
- ⚠️ Necesita implementar FCM o usar `send-fcm-notification`

**Recomendación:** Cambiar todas las llamadas a usar `send-fcm-notification` que ya está completamente implementada.

