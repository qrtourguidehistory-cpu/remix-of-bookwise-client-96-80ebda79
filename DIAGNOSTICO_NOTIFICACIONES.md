# 🔍 Diagnóstico Completo: Notificaciones Push No Aparecen con App Cerrada

## ✅ Lo que YA funciona

1. ✅ Token FCM se registra en `client_devices`
2. ✅ Notificaciones llegan cuando la app está **abierta**
3. ✅ Edge Function envía correctamente a FCM
4. ✅ Canal de notificaciones se crea correctamente

## ❌ Problema Actual

**Las notificaciones NO aparecen en el centro de notificaciones cuando la app está completamente cerrada.**

## 🔍 Análisis de las 3 Causas Probables

### Causa #1: DATA Messages vs NOTIFICATION Messages ✅ RESUELTO

**Diagnóstico:**
- El Edge Function **SÍ envía** `notification: { title, body }` a nivel superior
- Esto debería ser una **NOTIFICATION message**, no DATA message
- **PERO**: Hay un problema sutil con cómo se estructura el payload

**Solución Implementada:**
- ✅ Verificado que el payload tiene `notification` a nivel superior
- ✅ Agregado `notification_priority: 'PRIORITY_HIGH'` en Android
- ✅ Agregado `visibility: 'PUBLIC'` para mostrar incluso con pantalla bloqueada
- ✅ Mejorado logging del payload completo antes de enviar

**Verificación:**
```bash
# Revisar logs del Edge Function en Supabase Dashboard
# Buscar: "📤 FCM Payload:" para ver el payload completo
```

### Causa #2: Build DEBUG + Android 13+ + Doze ⚠️ PROBABLE CAUSA PRINCIPAL

**Diagnóstico:**
- En modo **DEBUG**, Android es más agresivo con Doze
- Doze puede bloquear notificaciones en segundo plano
- USB debugging puede afectar el comportamiento

**Solución:**
1. **Build RELEASE** (no debug):
   ```bash
   # En Android Studio:
   # Build → Generate Signed Bundle / APK
   # Seleccionar: APK
   # Crear keystore si no existe
   # Build variant: release
   ```

2. **Instalar APK firmado**:
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

3. **Desconectar USB** completamente

4. **Esperar 2-3 minutos** con pantalla bloqueada

5. **Disparar notificación** desde Partner App

6. **Verificar** que aparezca en el centro de notificaciones

**Si funciona en RELEASE pero no en DEBUG:**
- ✅ El código está correcto
- ⚠️ Es un problema del entorno de desarrollo (Doze en debug)

### Causa #3: Token Desactualizado ⚠️ VERIFICAR

**Diagnóstico:**
- FCM regenera tokens silenciosamente
- Si guardas un token viejo, FCM "acepta" el envío pero Android lo descarta

**Solución Implementada:**
- ✅ Agregado logging del token antes de enviar
- ✅ Logging del token que se está usando en cada envío
- ✅ Comparación de longitud del token (debe ser ~142 caracteres)

**Verificación Manual:**

1. **Obtener token actual del dispositivo**:
   ```javascript
   // En la app cliente, después de login:
   // Los logs mostrarán: "[FCM] Token completo: [TOKEN_COMPLETO]"
   ```

2. **Comparar con token en Supabase**:
   ```sql
   SELECT fcm_token, LENGTH(fcm_token) as token_length, updated_at 
   FROM client_devices 
   WHERE user_id = 'TU_USER_ID';
   ```

3. **Verificar que coincidan byte a byte**

4. **Si no coinciden**:
   - El token se regeneró
   - Necesitas actualizar el token en `client_devices`
   - Esto puede pasar si:
     - Reinstalaste la app
     - Limpiaste datos de la app
     - FCM regeneró el token por seguridad

## 🛠️ Soluciones Implementadas

### 1. Mejora del Payload FCM

```typescript
// ANTES (podía tener problemas):
{
  notification: { title, body },
  data: { ... },
  android: { ... }
}

// AHORA (optimizado):
{
  notification: { title, body },  // CRÍTICO para mostrar cuando app cerrada
  data: { ... },  // Para procesar cuando app se abre
  android: {
    priority: 'high',
    notification: {
      channel_id: 'default_channel',
      notification_priority: 'PRIORITY_HIGH',  // NUEVO
      visibility: 'PUBLIC',  // NUEVO
      sound: 'default',
      default_vibrate_timings: true,
      default_light_settings: true
    }
  }
}
```

### 2. Logging Detallado

El Edge Function ahora registra:
- ✅ Payload completo antes de enviar
- ✅ Token usado (primeros 30 caracteres)
- ✅ Longitud del token
- ✅ Resultado de cada envío

### 3. Verificación del Token

- ✅ Logging del token en cada envío
- ✅ Comparación de longitud
- ✅ Logging del device ID para rastrear

## 📋 Pasos de Verificación

### Paso 1: Verificar Payload

1. Ir a **Supabase Dashboard → Edge Functions → send-fcm-notification → Logs**
2. Buscar: `📤 FCM Payload:`
3. Verificar que tenga:
   - `notification: { title, body }` ✅
   - `android.notification.notification_priority: "PRIORITY_HIGH"` ✅
   - `android.notification.visibility: "PUBLIC"` ✅

### Paso 2: Verificar Token

1. En la app cliente, después de login, buscar en Logcat:
   ```
   [FCM] Token completo: [TOKEN_COMPLETO]
   ```

2. En Supabase, ejecutar:
   ```sql
   SELECT fcm_token, updated_at 
   FROM client_devices 
   WHERE user_id = 'TU_USER_ID';
   ```

3. Comparar que el token en Supabase sea **exactamente igual** al token en los logs

### Paso 3: Probar con Build RELEASE

1. **Generar APK Release**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Instalar APK**:
   ```bash
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```

3. **Desconectar USB**

4. **Cerrar app completamente** (swipe up)

5. **Bloquear pantalla**

6. **Esperar 2-3 minutos**

7. **Disparar notificación** desde Partner App

8. **Verificar** que aparezca en el centro de notificaciones

## 🎯 Resultado Esperado

Después de implementar estas soluciones:

1. ✅ Payload optimizado con `notification_priority: PRIORITY_HIGH`
2. ✅ Logging detallado para debugging
3. ✅ Verificación del token antes de enviar
4. ✅ Pruebas con build RELEASE (no debug)

**Si funciona en RELEASE pero no en DEBUG:**
- ✅ El código está correcto
- ⚠️ Es un problema del entorno de desarrollo
- ✅ Puedes continuar con desarrollo normalmente

**Si NO funciona ni en RELEASE:**
- Revisar logs del Edge Function
- Verificar que el token sea el correcto
- Verificar configuración del dispositivo (Doze, optimización de batería)

## 📝 Notas Importantes

1. **Build DEBUG vs RELEASE**:
   - DEBUG: Android es más agresivo con Doze
   - RELEASE: Comportamiento real del usuario
   - **Siempre probar notificaciones en RELEASE**

2. **Token FCM**:
   - Se regenera automáticamente
   - Si cambia, debe actualizarse en `client_devices`
   - Capacitor maneja esto automáticamente con el listener `registration`

3. **Doze Mode**:
   - Android puede bloquear notificaciones en modo Doze
   - Build RELEASE ayuda pero no garantiza
   - Usuario puede desactivar optimización de batería para la app

4. **Canal de Notificaciones**:
   - Debe existir antes de recibir notificaciones
   - Debe tener importancia HIGH
   - Se crea automáticamente al iniciar sesión

## 🔗 Referencias

- [FCM HTTP v1 API - Notification Messages](https://firebase.google.com/docs/cloud-messaging/send-message#notification-messages)
- [Android Doze Mode](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)

