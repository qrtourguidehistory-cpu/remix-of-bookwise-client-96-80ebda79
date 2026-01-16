# ✅ Solución Final - Sistema de Notificaciones Push

## 📋 Resumen

Sistema de notificaciones push limpio, mínimo y estable usando **SOLO** `@capacitor/push-notifications` para Capacitor + Android + Firebase Cloud Messaging.

---

## 🎯 Arquitectura

### Archivos Principales

1. **`src/utils/pushNotifications.ts`** - Función `initPushNotifications()` única y centralizada
2. **`android/app/src/main/AndroidManifest.xml`** - Configuración FCM para background
3. **`src/contexts/AuthContext.tsx`** - Inicialización después del login

### Flujo de Inicialización

```
1. Usuario hace login
   ↓
2. AuthContext detecta SIGNED_IN
   ↓
3. Llama initPushNotifications(userId)
   ↓
4. Configura listeners (ANTES de registrar)
   ↓
5. Solicita permisos
   ↓
6. Crea canal Android "default_channel" (importance: HIGH)
   ↓
7. Registra push notifications
   ↓
8. Token FCM recibido → Guardado en Supabase (client_devices)
```

---

## 📁 Archivos Modificados/Creados

### 1. `src/utils/pushNotifications.ts` (NUEVO)

Función única y centralizada que:
- ✅ Usa SOLO `@capacitor/push-notifications`
- ✅ Evita múltiples inicializaciones (flag `isInitialized`)
- ✅ Configura listeners ANTES de registrar
- ✅ Crea canal Android con importancia HIGH
- ✅ Guarda token FCM en Supabase

**Uso:**
```typescript
import { initPushNotifications } from '@/utils/pushNotifications';

// Llamar DESPUÉS del login
await initPushNotifications(userId);
```

### 2. `android/app/src/main/AndroidManifest.xml` (MODIFICADO)

Agregado servicio FCM para background:
```xml
<service
    android:name="com.google.firebase.messaging.FirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

### 3. `src/contexts/AuthContext.tsx` (MODIFICADO)

Actualizado para usar `initPushNotifications` en lugar de `initFCM`:
- Se llama después de `SIGNED_IN`
- Se llama para sesión existente al iniciar app

---

## 🔧 Configuración del Canal Android

El canal `default_channel` se crea con:

```typescript
{
  id: 'default_channel',
  name: 'Notificaciones',
  description: 'Notificaciones importantes de la app',
  importance: 5, // IMPORTANCE_HIGH - crítico para app cerrada
  sound: 'default',
  vibration: true,
  visibility: 1, // VISIBILITY_PUBLIC
}
```

**Importancia:** `5` (HIGH) es obligatorio para que funcione con app cerrada y pantalla bloqueada.

---

## 📤 Payload FCM HTTP v1 (Backend)

Tu backend DEBE enviar notificaciones con este formato:

```json
{
  "message": {
    "token": "FCM_TOKEN_DEL_DISPOSITIVO",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "default_channel",
        "sound": "default",
        "priority": "high"
      }
    },
    "data": {
      "type": "reservation_confirmed",
      "reservation_id": "123"
    }
  }
}
```

**Requisitos obligatorios:**
- ✅ `notification` (title + body)
- ✅ `android.priority: "high"`
- ✅ `android.notification.channel_id: "default_channel"`

Ver `FCM_PAYLOAD_EJEMPLO.md` para ejemplos completos.

---

## 🚫 Qué NO Hacer

Ver `QUE_NO_HACER.md` para lista completa. Resumen:

1. ❌ NO usar Firebase Web SDK
2. ❌ NO registrar push más de una vez
3. ❌ NO registrar `pushNotificationReceived` (solo `pushNotificationActionPerformed`)
4. ❌ NO crear canal después de registrar push
5. ❌ NO usar importancia baja en el canal
6. ❌ NO enviar payload sin `notification`
7. ❌ NO enviar payload sin `android.priority: "high"`
8. ❌ NO usar canal diferente al creado
9. ❌ NO llamar `initPushNotifications` antes del login
10. ❌ NO olvidar servicio FCM en AndroidManifest.xml

---

## ✅ Checklist de Implementación

### Frontend (App Cliente)

- [x] Función `initPushNotifications()` creada
- [x] AndroidManifest.xml con servicio FCM
- [x] AuthContext actualizado para usar nueva función
- [x] Canal Android creado con importancia HIGH
- [x] Listeners configurados ANTES de registrar
- [x] Token FCM guardado en Supabase

### Backend (App Partner)

- [ ] Payload incluye `notification` (title + body)
- [ ] Payload incluye `android.priority: "high"`
- [ ] Payload incluye `android.notification.channel_id: "default_channel"`
- [ ] Backend usa HTTP v1 API de Firebase
- [ ] Backend obtiene token FCM de `client_devices`

### Testing

- [ ] Rebuild completo (`npm run build && npx cap sync android`)
- [ ] App desinstalada e instalada de nuevo
- [ ] Login exitoso
- [ ] Permisos concedidos
- [ ] Token FCM recibido y guardado
- [ ] App cerrada completamente
- [ ] Notificación enviada desde backend
- [ ] Notificación aparece en centro de notificaciones
- [ ] Notificación funciona con pantalla bloqueada

---

## 🔍 Verificación

### Logs Esperados

```
[Push] ===== INICIANDO REGISTRO PUSH =====
[Push] UserId: xxx
[Push] 📡 Configurando listeners...
[Push] ✅ Listeners configurados
[Push] 🔐 Solicitando permisos...
[Push] ✅ Permisos concedidos
[Push] 📢 Creando canal "default_channel"...
[Push] ✅ Canal creado (importance: HIGH)
[Push] 📝 Registrando push notifications...
[Push] ✅ Registro completado
[Push] ✅ Token FCM recibido: xxx...
[Push] ✅ Token guardado en Supabase
[Push] ✅✅✅ INICIALIZACIÓN COMPLETADA ✅✅✅
```

### Verificar Canal en Android

1. Configuración → Apps → Mí Turnow → Notificaciones
2. Debe aparecer canal "Notificaciones" con importancia Alta

---

## 🚀 Próximos Pasos

1. **Rebuild completo:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **En Android Studio:**
   - Build → Clean Project
   - Build → Rebuild Project
   - Run → Run 'app'

3. **Probar:**
   - Desinstalar app anterior
   - Instalar nueva versión
   - Login
   - Cerrar app completamente
   - Enviar notificación desde backend
   - Verificar que aparece en centro de notificaciones

---

## 📚 Documentación Adicional

- `FCM_PAYLOAD_EJEMPLO.md` - Ejemplos de payload FCM HTTP v1
- `QUE_NO_HACER.md` - Lista completa de qué NO hacer

---

## ✅ Resultado Esperado

Después de esta implementación:

- ✅ Notificaciones aparecen en centro de notificaciones
- ✅ Funcionan con app cerrada
- ✅ Funcionan con pantalla bloqueada
- ✅ Hacen sonido y vibran
- ✅ Son visibles como notificaciones del sistema Android
- ✅ Código limpio, mínimo y estable
- ✅ Sin SDKs redundantes ni hacks

---

## 🔧 Mantenimiento

### Si las notificaciones dejan de funcionar:

1. Verificar que el canal tiene importancia HIGH (5)
2. Verificar que el payload incluye `notification` + `android.priority: "high"`
3. Verificar que el `channel_id` coincide
4. Verificar que el servicio FCM está en AndroidManifest.xml
5. Verificar que NO estás registrando `pushNotificationReceived`
6. Verificar que `initPushNotifications` se llama solo una vez
7. Verificar que se llama después del login

### Si necesitas cambiar el canal:

1. Modificar `src/utils/pushNotifications.ts` (crear nuevo canal)
2. Actualizar `AndroidManifest.xml` (meta-data `default_notification_channel_id`)
3. Actualizar backend (usar nuevo `channel_id` en payload)

---

## 📝 Notas Técnicas

- **Capacitor 7.x** requiere `@capacitor/push-notifications` v7.x
- **Android 8.0+** requiere canales de notificaciones explícitos
- **FCM HTTP v1** es la API recomendada (no Legacy)
- **Token FCM** se obtiene del listener `registration`
- **Token se guarda** en tabla `client_devices` con `user_id` y `fcm_token`

---

**Última actualización:** Implementación final y estable

