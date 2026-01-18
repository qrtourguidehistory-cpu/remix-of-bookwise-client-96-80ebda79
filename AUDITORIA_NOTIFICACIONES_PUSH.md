# 🔍 AUDITORÍA: Notificaciones Push dejaron de funcionar

## 🐛 PROBLEMA REPORTADO

**Síntoma:** Las notificaciones push dejaron de funcionar después del cambio de package name a `com.bookwise.client`.

---

## ✅ VERIFICACIONES REALIZADAS

### 1. ✅ google-services.json

**Estado:** ✅ **CORRECTO**

**Ubicación:** `android/app/google-services.json`

**Contenido verificado:**
```json
{
  "client": [{
    "client_info": {
      "android_client_info": {
        "package_name": "com.bookwise.client"  ✅ CORRECTO
      }
    }
  }]
}
```

**Conclusión:** El archivo `google-services.json` coincide con el nuevo package name `com.bookwise.client`.

---

### 2. ✅ Configuración de Firebase en build.gradle

**Estado:** ✅ **CORRECTO**

**Ubicaciones:**
- `android/build.gradle`: Plugin `google-services` agregado ✅
- `android/app/build.gradle`: 
  - Firebase BOM configurado ✅
  - Plugin aplicado si existe `google-services.json` ✅

**Código:**
```gradle
// android/build.gradle
classpath 'com.google.gms:google-services:4.4.2'

// android/app/build.gradle
implementation platform('com.google.firebase:firebase-bom:34.7.0')
implementation 'com.google.firebase:firebase-messaging'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
```

**Conclusión:** La configuración de Firebase está correcta.

---

### 3. ✅ Registro de Tokens en Supabase

**Estado:** ⚠️ **REQUIERE VERIFICACIÓN**

**Código de registro:** `src/hooks/useFCMNotifications.ts`

**Tabla usada:** `client_devices`

**Estructura de tabla (migración):**
```sql
CREATE TABLE IF NOT EXISTS public.client_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  platform text NOT NULL,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT client_devices_user_token_unique UNIQUE (user_id, fcm_token)
);
```

**Proceso de registro:**
1. Hook `useFCMNotifications` se inicializa cuando hay `userId`
2. Llama a `PushNotifications.register()` de Capacitor
3. Listener `registration` recibe el token FCM
4. Llama a `registerToken(token, userId)` que hace UPSERT en `client_devices`

**Logs esperados en Logcat:**
- `📱 [FCM] ===== TOKEN FCM GENERADO =====`
- `📤 [FCM] ===== INICIANDO UPSERT A client_devices =====`
- `✅ [FCM] Token registrado/actualizado exitosamente en Supabase`

---

## 🔍 POSIBLES PROBLEMAS

### Problema 1: 🔴 Token FCM no se está generando

**Causa posible:**
- Firebase no está configurado correctamente en Firebase Console
- El SHA-1 del keystore no está registrado en Firebase Console
- El package name `com.bookwise.client` no está registrado en Firebase Console

**Verificación:**
1. Ir a Firebase Console → Project Settings → Your apps
2. Verificar que existe una app Android con package name: `com.bookwise.client`
3. Verificar que el SHA-1 del keystore de producción está registrado
4. Verificar que `google-services.json` descargado coincide con el package name

### Problema 2: 🟡 Token FCM se genera pero no se registra en Supabase

**Causa posible:**
- Error en UPSERT a `client_devices`
- Problema de permisos RLS en Supabase
- Error de autenticación al hacer el UPSERT

**Verificación:**
1. Revisar logs en Logcat buscando:
   - `❌ [FCM] Error al registrar token en Supabase:`
   - `❌ [FCM] Error al establecer sesión:`
2. Verificar que la tabla `client_devices` existe en Supabase
3. Verificar que las políticas RLS permiten INSERT/UPDATE para el usuario autenticado

### Problema 3: 🟡 Token se registra pero no se reciben notificaciones

**Causa posible:**
- El backend no está usando la tabla `client_devices` para enviar notificaciones
- Problema con la función de Supabase que envía notificaciones
- Token inválido o expirado

**Verificación:**
1. Verificar en Supabase que el token está en `client_devices`
2. Revisar la función Edge `send-fcm-notification` que debería usar `client_devices`
3. Verificar que las notificaciones se están enviando a tokens válidos

---

## ✅ RECOMENDACIONES

### 1. Verificar Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar proyecto `bookwise-cliente`
3. Ir a Project Settings → Your apps
4. Verificar app Android con package name `com.bookwise.client`
5. Si no existe, agregarla
6. Descargar nuevo `google-services.json` si fue agregada
7. Verificar SHA-1 del keystore de producción está registrado

### 2. Verificar SHA-1 del Keystore

```bash
# Obtener SHA-1 del keystore de producción
keytool -list -v -keystore "C:\Users\laptop\Desktop\LLAVE CLIENTE TURNOW\llave_cliente_miturnow.jks" -alias cliente_prod
```

Registrar el SHA-1 en Firebase Console → Project Settings → Your apps → App → SHA certificate fingerprints

### 3. Verificar Tabla client_devices en Supabase

1. Ir a Supabase Dashboard
2. Tabla Editor → `client_devices`
3. Verificar que existen registros con tokens FCM
4. Verificar que `user_id` corresponde a usuarios autenticados

### 4. Probar Registro de Token Manualmente

Revisar logs en Logcat cuando el usuario inicia sesión:
- Buscar logs `📱 [FCM]`
- Verificar que aparece `🎉 [FCM] ===== TOKEN FCM GENERADO =====`
- Verificar que aparece `✅ [FCM] Token registrado/actualizado exitosamente`

---

## 🔧 PRÓXIMOS PASOS

1. ✅ Verificar Firebase Console tiene app con package `com.bookwise.client`
2. ✅ Verificar SHA-1 del keystore está registrado
3. ✅ Rebuild la app en Android Studio después de verificar Firebase
4. ✅ Probar login y verificar logs de registro de token
5. ✅ Verificar en Supabase que el token se guardó en `client_devices`

---

**Estado:** ⚠️ **REQUIERE VERIFICACIÓN DE FIREBASE CONSOLE**

El código y configuración local parecen correctos, pero es necesario verificar la configuración en Firebase Console.

