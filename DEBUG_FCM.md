# Debug FCM - Pasos de Verificación

## 🔍 Problema Identificado y Solucionado

### Problemas Encontrados:
1. **Listeners agregados DESPUÉS de `register()`** - El token puede llegar antes de que los listeners estén listos
2. **Múltiples inicializaciones** - No había flag para evitar llamadas duplicadas
3. **Falta de logs detallados** - Difícil debuggear sin información suficiente
4. **Verificación de sesión faltante** - El token podría guardarse sin sesión activa

### Soluciones Implementadas:
1. ✅ **Listeners configurados ANTES de `register()`**
2. ✅ **Flag `isInitialized` para evitar múltiples inicializaciones**
3. ✅ **Logs exhaustivos en cada paso**
4. ✅ **Verificación de sesión antes de guardar token**
5. ✅ **Delay pequeño antes de inicializar FCM para asegurar que todo esté listo**

## 🚀 Pasos para Probar

### 1. Limpiar Logs
```powershell
adb logcat -c
```

### 2. Rebuild y Reinstalar
En Android Studio:
- **Build** → **Clean Project**
- **Build** → **Rebuild Project**
- **Run** → **Run 'app'**

### 3. Ver Logs en Tiempo Real
Abre una terminal y ejecuta:
```powershell
adb logcat | Select-String -Pattern "FCM|AuthContext"
```

### 4. Flujo de Prueba
1. **Desinstalar app anterior** (si existe):
   ```powershell
   adb uninstall com.bookwise.client
   ```

2. **Instalar nueva versión** desde Android Studio

3. **Abrir la app** - Deberías ver logs de AuthContext

4. **Iniciar sesión con Google** - Deberías ver:
   ```
   ✅ AuthContext: SIGNED_IN detectado
   ✅ AuthContext: Iniciando FCM después de SIGNED_IN...
   [FCM] ===== INICIANDO REGISTRO FCM =====
   ```

5. **Aceptar permisos** - Deberías ver:
   ```
   [FCM] ✅ Permisos concedidos
   [FCM] 📝 Llamando a PushNotifications.register()...
   [FCM] ✅ PushNotifications.register() llamado exitosamente
   ```

6. **Esperar token** - Deberías ver:
   ```
   [FCM] ===== TOKEN FCM RECIBIDO =====
   [FCM] Token completo: <token>
   [FCM] ✅ Sesión verificada, guardando token...
   [FCM] ✅✅✅ TOKEN GUARDADO EXITOSAMENTE EN SUPABASE ✅✅✅
   ```

## 🔍 Verificación en Supabase

Ejecuta esta query:
```sql
SELECT * FROM client_devices ORDER BY updated_at DESC LIMIT 5;
```

Debe mostrar:
- `user_id`: Tu ID de usuario
- `fcm_token`: Token FCM completo
- `platform`: "android"
- `updated_at`: Timestamp reciente

## 🐛 Troubleshooting

### Si NO ves logs de FCM:
1. Verifica que estás en Android nativo:
   ```javascript
   console.log('Platform:', Capacitor.getPlatform());
   console.log('isNative:', Capacitor.isNativePlatform());
   ```

2. Verifica que `initFCM` se está llamando:
   - Busca logs de `AuthContext: SIGNED_IN`
   - Busca logs de `AuthContext: Iniciando FCM`

### Si el token NO se guarda:
1. Verifica logs de error:
   ```powershell
   adb logcat | Select-String -Pattern "FCM.*Error|FCM.*❌"
   ```

2. Verifica sesión de Supabase:
   - Los logs deben mostrar `[FCM] ✅ Sesión verificada`

3. Verifica RLS policies:
   - El usuario debe poder INSERT/UPDATE en `client_devices`

### Si las notificaciones NO llegan:
1. Verifica que el token está en `client_devices`
2. Verifica que el backend está enviando notificaciones
3. Verifica que `google-services.json` es correcto
4. Verifica que Firebase está configurado en Firebase Console

## 📝 Logs Esperados (Completos)

```
✅ AuthContext: SIGNED_IN detectado, usuario: <email>
✅ AuthContext: User ID: <user-id>
✅ AuthContext: Platform: android
✅ AuthContext: isNativePlatform: true
✅ AuthContext: Iniciando FCM después de SIGNED_IN...
[FCM] ===== INICIANDO REGISTRO FCM =====
[FCM] Platform: android
[FCM] isNativePlatform(): true
[FCM] userId: <user-id>
[FCM] 📡 Configurando listeners...
[FCM] ✅ Listeners configurados correctamente
[FCM] 🔐 Solicitando permisos de notificaciones...
[FCM] ✅ Permisos concedidos
[FCM] 📝 Llamando a PushNotifications.register()...
[FCM] ✅ PushNotifications.register() llamado exitosamente
[FCM] ✅✅✅ INICIALIZACIÓN FCM COMPLETADA ✅✅✅
[FCM] ===== TOKEN FCM RECIBIDO =====
[FCM] Token completo: <fcm-token>
[FCM] Token length: <length>
[FCM] ✅ Sesión verificada, guardando token...
[FCM] userId a guardar: <user-id>
[FCM] ✅✅✅ TOKEN GUARDADO EXITOSAMENTE EN SUPABASE ✅✅✅
```

## ✅ Checklist Final

- [ ] Logs de FCM aparecen en logcat
- [ ] Token FCM se recibe
- [ ] Token se guarda en Supabase
- [ ] Registro aparece en `client_devices`
- [ ] Notificaciones llegan con app cerrada
- [ ] Notificaciones aparecen en centro de notificaciones

