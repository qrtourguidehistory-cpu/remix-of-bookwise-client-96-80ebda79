# Implementación FCM Limpia - Solo @capacitor/push-notifications

## ✅ Limpieza Completada

### Archivos Eliminados (Código Nativo):
- ❌ `BookwiseFirebaseMessagingService.java` - Eliminado
- ❌ `FCMTokenManager.java` - Eliminado  
- ❌ `FCMTokenPlugin.java` - Eliminado
- ❌ `FCMTokenSyncWeb.ts` - Eliminado

### Archivos Limpiados:
- ✅ `MainActivity.java` - Removida llamada a FCMTokenManager
- ✅ `AndroidManifest.xml` - Removido servicio FCM nativo
- ✅ `AuthContext.tsx` - Removido plugin nativo, ahora usa `initFCM()`
- ✅ `App.tsx` - Removido componente `FCMInitializer`

## ✅ Nueva Implementación

### Archivo Creado:
- ✅ `src/utils/fcm.ts` - Función `initFCM()` usando EXCLUSIVAMENTE `@capacitor/push-notifications`

### Flujo de Ejecución:

1. **Usuario inicia sesión** → `AuthContext` detecta `SIGNED_IN`
2. **Se llama `initFCM(userId)`** → Solo en plataforma nativa
3. **Solicita permisos** → `PushNotifications.requestPermissions()`
4. **Registra para token** → `PushNotifications.register()`
5. **Listener recibe token** → Guarda en Supabase `client_devices`
6. **Notificaciones funcionan** → Con app cerrada y pantalla bloqueada

## 📋 Código Implementado

### `src/utils/fcm.ts`
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export async function initFCM(userId: string) {
  if (!Capacitor.isNativePlatform()) return;

  // 1. Solicitar permisos
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;

  // 2. Registrar para recibir token
  await PushNotifications.register();

  // 3. Listener para token
  PushNotifications.addListener('registration', async (token) => {
    await supabase.from('client_devices').upsert({
      user_id: userId,
      fcm_token: token.value,
      platform: 'android'
    });
  });
}
```

### `src/contexts/AuthContext.tsx`
```typescript
import { initFCM } from '@/utils/fcm';

// En onAuthStateChange:
if (event === 'SIGNED_IN' && session?.user) {
  if (Capacitor.isNativePlatform()) {
    initFCM(session.user.id);
  }
}
```

## 🚀 Próximos Pasos

### 1. Limpiar Build (OBLIGATORIO)
```powershell
# Desinstalar app
adb uninstall com.bookwise.client

# Sincronizar Capacitor
npx cap sync android

# Limpiar Gradle
cd android
.\gradlew.bat clean
cd ..

# Abrir en Android Studio
npx cap open android
```

### 2. Rebuild y Probar
- Build → Clean Project
- Build → Rebuild Project
- Run → Run 'app'

### 3. Probar Flujo Completo
1. Instalar app en dispositivo físico
2. Iniciar sesión con Google
3. Aceptar permisos de notificaciones
4. Verificar logs: `adb logcat | Select-String -Pattern "FCM"`
5. Verificar en Supabase: `SELECT * FROM client_devices;`

### 4. Verificar Notificaciones
1. Cerrar la app completamente
2. Desde app partner, confirmar una reservación
3. La notificación debe aparecer en el centro de notificaciones del celular

## ✅ Verificación Esperada

### Logs Esperados:
```
[FCM] ===== INICIANDO REGISTRO FCM =====
[FCM] userId: <user-id>
[FCM] ✅ Permisos concedidos
[FCM] ✅ PushNotifications.register() llamado
[FCM] ===== TOKEN FCM RECIBIDO =====
[FCM] Token: <fcm-token>
[FCM] ✅ Token guardado exitosamente en Supabase
```

### En Supabase:
```sql
SELECT * FROM client_devices;
-- Debe mostrar al menos 1 fila con:
-- user_id: <user-id>
-- fcm_token: <token>
-- platform: 'android'
```

## 🔴 Reglas Importantes

✅ **SOLO usar** `@capacitor/push-notifications`
✅ **NO usar** código nativo Java/Kotlin para FCM
✅ **NO duplicar** registro de token
✅ **Ejecutar** `initFCM()` SOLO después del login

❌ **NO mezclar** FCM nativo con Capacitor
❌ **NO llamar** `initFCM()` antes del login
❌ **NO usar** múltiples fuentes de token

## 📝 Notas

- El plugin `@capacitor/push-notifications` maneja automáticamente:
  - Solicitud de permisos
  - Registro de token FCM
  - Recepción de notificaciones
  - Manejo de tokens actualizados

- Firebase se configura automáticamente con `google-services.json`
- No se necesita código nativo adicional
- Capacitor es la única fuente de verdad para FCM

