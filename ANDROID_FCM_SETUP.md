# Configuración de FCM Token Registration en Android

## Implementación Completa

Se ha implementado el registro completo del token FCM en código nativo Android.

### Archivos Creados/Modificados

#### 1. **BookwiseFirebaseMessagingService.java**
- Servicio que extiende `FirebaseMessagingService`
- Maneja `onNewToken()` cuando Firebase genera un nuevo token
- Guarda el token en SharedPreferences
- Intenta enviarlo al backend si hay usuario logueado

#### 2. **FCMTokenManager.java**
- Manager para obtener y enviar tokens FCM
- `getFCMToken()`: Obtiene el token usando `FirebaseMessaging.getInstance().getToken()`
- `sendTokenToBackend()`: Envía el token a Supabase usando UPSERT
- `onUserLoggedIn()`: Se llama después del login para sincronizar el token
- `onUserLoggedOut()`: Limpia datos después del logout

#### 3. **FCMTokenPlugin.java**
- Plugin de Capacitor para comunicar JavaScript con código nativo
- `syncTokenAfterLogin()`: Sincroniza token después del login
- `onUserLoggedOut()`: Limpia datos después del logout
- `getCurrentToken()`: Obtiene el token actual

#### 4. **MainActivity.java**
- Modificado para solicitar token FCM al iniciar la app
- Llama a `FCMTokenManager.getFCMToken()` en `onCreate()`

#### 5. **AndroidManifest.xml**
- Agregado servicio `BookwiseFirebaseMessagingService`
- Configurado para recibir eventos de Firebase Messaging

#### 6. **build.gradle**
- ✅ Firebase Messaging ya estaba agregado
- ✅ Agregado OkHttp para llamadas HTTP
- ✅ Plugin google-services ya estaba configurado

#### 7. **AuthContext.tsx**
- Agregado plugin `FCMTokenSync`
- Llama a sincronización después de `SIGNED_IN`
- Limpia datos después de `SIGNED_OUT`
- También sincroniza si hay sesión existente al iniciar la app

### Flujo de Ejecución

1. **Al iniciar la app:**
   - `MainActivity.onCreate()` llama a `FCMTokenManager.getFCMToken()`
   - Firebase genera/obtiene el token FCM
   - Token se guarda en SharedPreferences
   - Si hay usuario logueado, se envía al backend

2. **Cuando Firebase genera nuevo token:**
   - `BookwiseFirebaseMessagingService.onNewToken()` se ejecuta
   - Token se guarda en SharedPreferences
   - Si hay usuario logueado, se envía al backend

3. **Después del login (Google Sign-In u otro):**
   - `AuthContext` detecta `SIGNED_IN`
   - Llama a `FCMTokenSync.syncTokenAfterLogin()` desde JavaScript
   - Plugin nativo llama a `FCMTokenManager.onUserLoggedIn()`
   - Se obtiene token guardado o se solicita uno nuevo
   - Token se envía al backend con `userId` y `accessToken`

4. **UPSERT a client_devices:**
   - Se usa `POST` con header `Prefer: resolution=merge-duplicates`
   - La constraint única `(user_id, fcm_token)` evita duplicados
   - Si existe, se actualiza; si no, se crea

### Logs Implementados

Todos los logs tienen prefijos claros:
- `🎉` Token FCM generado
- `📤` Enviando token al backend
- `✅` Token registrado exitosamente
- `❌` Errores
- `📱` Información general

### Verificación Requerida

1. **google-services.json:**
   - Verificar que existe en `android/app/google-services.json`
   - Si no existe, copiarlo desde Firebase Console

2. **Rebuild limpio:**
   ```bash
   # Limpiar proyecto
   cd android
   ./gradlew clean
   cd ..
   
   # Sincronizar Capacitor
   npx cap sync android
   
   # Rebuild
   cd android
   ./gradlew assembleDebug
   ```

3. **Desinstalar e instalar:**
   ```bash
   adb uninstall com.bookwise.client
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Verificar logs:**
   ```bash
   adb logcat | grep -E "FCMTokenManager|BookwiseFCMService|FCMTokenPlugin|MainActivity"
   ```

5. **Probar login:**
   - Iniciar sesión con Google
   - Verificar logs en logcat
   - Verificar que se crea registro en `client_devices`

### Troubleshooting

**Problema: Token no se genera**
- Verificar que `google-services.json` existe y es válido
- Verificar que Firebase está configurado en Firebase Console
- Verificar permisos de notificaciones en Android 13+

**Problema: Token no se envía al backend**
- Verificar logs de `FCMTokenManager`
- Verificar que hay `userId` en SharedPreferences después del login
- Verificar conexión a internet
- Verificar que la URL de Supabase es correcta

**Problema: UPSERT falla**
- Verificar que la tabla `client_devices` existe
- Verificar que la constraint única está creada
- Verificar RLS policies permiten INSERT/UPDATE

### Comandos de Verificación

```bash
# Ver logs en tiempo real
adb logcat | grep -E "FCM|Token"

# Verificar que el servicio está registrado
adb shell dumpsys package com.bookwise.client | grep -A 5 "BookwiseFirebaseMessagingService"

# Verificar SharedPreferences
adb shell run-as com.bookwise.client cat shared_prefs/bookwise_fcm.xml
adb shell run-as com.bookwise.client cat shared_prefs/bookwise_auth.xml
```

### Resultado Esperado

Después del login, la tabla `client_devices` debe tener al menos 1 fila con:
- `user_id`: ID del usuario autenticado
- `fcm_token`: Token FCM del dispositivo
- `platform`: "android"
- `device_info`: JSON con información del dispositivo
- `updated_at`: Timestamp actual

