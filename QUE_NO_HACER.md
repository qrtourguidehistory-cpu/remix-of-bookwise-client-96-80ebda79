# 🚫 Qué NO Hacer para No Romper las Notificaciones Push

## ❌ NO Hacer Estas Cosas

### 1. ❌ NO usar Firebase Web SDK en el código JavaScript

```typescript
// ❌ INCORRECTO - NO hacer esto
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

// ✅ CORRECTO - Solo usar esto
import { PushNotifications } from '@capacitor/push-notifications';
```

**Razón:** El Firebase Web SDK es para web, no para apps nativas. Capacitor ya maneja FCM nativamente.

---

### 2. ❌ NO registrar push más de una vez

```typescript
// ❌ INCORRECTO - NO hacer esto
useEffect(() => {
  initPushNotifications(userId); // Se ejecuta en cada render
}, [userId]);

// ✅ CORRECTO - Usar flag de inicialización
let isInitialized = false;
export async function initPushNotifications(userId: string) {
  if (isInitialized) return; // Evitar múltiples registros
  // ...
}
```

**Razón:** Registrar múltiples veces puede causar tokens duplicados y comportamiento impredecible.

---

### 3. ❌ NO registrar el listener 'pushNotificationReceived' cuando la app está cerrada

```typescript
// ❌ INCORRECTO - NO hacer esto si quieres notificaciones con app cerrada
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  // Procesar notificación
});

// ✅ CORRECTO - Solo registrar 'pushNotificationActionPerformed'
PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
  // Solo cuando el usuario hace clic en la notificación
});
```

**Razón:** Si registras `pushNotificationReceived`, Capacitor intercepta las notificaciones y Android NO las muestra automáticamente en el centro de notificaciones cuando la app está cerrada.

---

### 4. ❌ NO crear el canal después de registrar push

```typescript
// ❌ INCORRECTO - NO hacer esto
await PushNotifications.register();
await LocalNotifications.createChannel({ id: 'default_channel', ... });

// ✅ CORRECTO - Crear canal ANTES de registrar
await LocalNotifications.createChannel({ id: 'default_channel', ... });
await PushNotifications.register();
```

**Razón:** El canal DEBE existir antes de recibir notificaciones. Si no existe, Android ignora las notificaciones o usa un canal por defecto con baja importancia.

---

### 5. ❌ NO usar importancia baja en el canal

```typescript
// ❌ INCORRECTO - NO hacer esto
await LocalNotifications.createChannel({
  id: 'default_channel',
  importance: 3, // IMPORTANCE_LOW - NO funciona con app cerrada
});

// ✅ CORRECTO - Usar importancia HIGH
await LocalNotifications.createChannel({
  id: 'default_channel',
  importance: 5, // IMPORTANCE_HIGH - Funciona con app cerrada
});
```

**Razón:** Con importancia baja, las notificaciones solo aparecen cuando la app está abierta. Necesitas importancia HIGH para que funcionen con app cerrada y pantalla bloqueada.

---

### 6. ❌ NO enviar payload sin 'notification'

```json
// ❌ INCORRECTO - NO hacer esto
{
  "message": {
    "token": "FCM_TOKEN",
    "data": {
      "title": "Título",
      "body": "Mensaje"
    }
  }
}

// ✅ CORRECTO - Incluir 'notification'
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    },
    "android": {
      "priority": "high"
    }
  }
}
```

**Razón:** Sin `notification`, Android NO muestra la notificación automáticamente. Requiere que la app esté abierta para procesar el `data`.

---

### 7. ❌ NO enviar payload sin 'android.priority: "high"'

```json
// ❌ INCORRECTO - NO hacer esto
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    }
  }
}

// ✅ CORRECTO - Incluir priority high
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    },
    "android": {
      "priority": "high"
    }
  }
}
```

**Razón:** Sin `priority: "high"`, las notificaciones pueden no llegar cuando la app está cerrada o el dispositivo está en modo Doze.

---

### 8. ❌ NO usar un canal diferente al creado en la app

```json
// ❌ INCORRECTO - NO hacer esto si el canal no existe
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    },
    "android": {
      "notification": {
        "channel_id": "otro_canal" // Este canal no existe
      }
    }
  }
}

// ✅ CORRECTO - Usar el canal que creaste
{
  "message": {
    "token": "FCM_TOKEN",
    "notification": {
      "title": "Título",
      "body": "Mensaje"
    },
    "android": {
      "notification": {
        "channel_id": "default_channel" // El canal que creaste
      }
    }
  }
}
```

**Razón:** Si el canal no existe o tiene baja importancia, Android ignora la notificación o la muestra con baja prioridad.

---

### 9. ❌ NO llamar initPushNotifications antes del login

```typescript
// ❌ INCORRECTO - NO hacer esto
useEffect(() => {
  initPushNotifications(null); // Sin userId
}, []);

// ✅ CORRECTO - Llamar después del login
onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    initPushNotifications(session.user.id);
  }
});
```

**Razón:** Necesitas el `userId` para guardar el token FCM en la base de datos. Sin userId, no puedes asociar el token con el usuario.

---

### 10. ❌ NO olvidar el servicio de FCM en AndroidManifest.xml

```xml
<!-- ❌ INCORRECTO - NO olvidar esto -->
<!-- Sin el servicio, las notificaciones no funcionan con app cerrada -->

<!-- ✅ CORRECTO - Incluir el servicio -->
<service
    android:name="com.google.firebase.messaging.FirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

**Razón:** Sin el servicio, FCM no puede procesar notificaciones cuando la app está cerrada.

---

## ✅ Resumen: Qué SÍ Hacer

1. ✅ Usar SOLO `@capacitor/push-notifications`
2. ✅ Registrar push UNA sola vez (usar flag)
3. ✅ NO registrar `pushNotificationReceived` (solo `pushNotificationActionPerformed`)
4. ✅ Crear canal ANTES de registrar push
5. ✅ Usar importancia HIGH (5) en el canal
6. ✅ Enviar payload con `notification` + `android.priority: "high"`
7. ✅ Usar `channel_id: "default_channel"` en el payload
8. ✅ Llamar `initPushNotifications` DESPUÉS del login
9. ✅ Incluir servicio FCM en AndroidManifest.xml
10. ✅ Probar con app cerrada y pantalla bloqueada

---

## 🔍 Verificación Rápida

Si las notificaciones NO funcionan, verifica:

- [ ] ¿El canal tiene importancia HIGH (5)?
- [ ] ¿El payload incluye `notification`?
- [ ] ¿El payload incluye `android.priority: "high"`?
- [ ] ¿El `channel_id` coincide con el creado en la app?
- [ ] ¿El servicio FCM está en AndroidManifest.xml?
- [ ] ¿NO estás registrando `pushNotificationReceived`?
- [ ] ¿Estás llamando `initPushNotifications` solo una vez?
- [ ] ¿Estás llamando `initPushNotifications` después del login?

