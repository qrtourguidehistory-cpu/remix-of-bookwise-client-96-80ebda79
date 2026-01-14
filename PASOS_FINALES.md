# Pasos Finales - FCM Implementación Limpia

## ✅ Sincronización Completada

`npx cap sync android` se ejecutó exitosamente desde la raíz del proyecto.

## 🚀 Próximos Pasos en Android Studio

### 1. Limpiar Proyecto
- **Build** → **Clean Project**
- Esperar a que termine

### 2. Rebuild Proyecto
- **Build** → **Rebuild Project**
- Esperar a que compile completamente

### 3. Ejecutar App
- Conecta tu dispositivo físico Android
- **Run** → **Run 'app'**
- O presiona el botón verde de "Run"

## 📱 Flujo de Prueba

### 1. Instalación
- La app se instalará automáticamente en tu dispositivo
- Si hay una versión anterior, se reemplazará

### 2. Login
- Abre la app
- Inicia sesión con Google
- **Acepta los permisos de notificaciones** cuando se soliciten

### 3. Verificar Logs
Abre una terminal y ejecuta:
```powershell
adb logcat | Select-String -Pattern "FCM"
```

Deberías ver:
```
[FCM] ===== INICIANDO REGISTRO FCM =====
[FCM] userId: <tu-user-id>
[FCM] ✅ Permisos concedidos
[FCM] ✅ PushNotifications.register() llamado
[FCM] ===== TOKEN FCM RECIBIDO =====
[FCM] Token: <fcm-token>
[FCM] ✅ Token guardado exitosamente en Supabase
```

### 4. Verificar en Supabase
Ejecuta esta query:
```sql
SELECT * FROM client_devices;
```

Debe mostrar al menos 1 fila con:
- `user_id`: Tu ID de usuario
- `fcm_token`: El token FCM generado
- `platform`: "android"

### 5. Probar Notificación Push
1. **Cierra completamente la app** (no solo minimizar)
2. Desde la app **partner**, confirma una reservación
3. La notificación debe aparecer en el **centro de notificaciones** del celular
4. Debe aparecer incluso con la pantalla bloqueada

## 🔍 Troubleshooting

### Si el token NO se registra:
1. Verifica los logs con `adb logcat | Select-String -Pattern "FCM"`
2. Verifica que los permisos fueron concedidos
3. Verifica que hay conexión a internet
4. Verifica que la sesión de Supabase está activa

### Si las notificaciones NO llegan:
1. Verifica que el token está en `client_devices`
2. Verifica que el backend está enviando las notificaciones
3. Verifica que `google-services.json` está correcto
4. Verifica que Firebase está configurado en Firebase Console

### Si hay errores de compilación:
1. **File** → **Invalidate Caches / Restart**
2. Espera a que Android Studio reinicie
3. **Build** → **Clean Project**
4. **Build** → **Rebuild Project**

## ✅ Checklist Final

- [ ] App instalada en dispositivo físico
- [ ] Login exitoso con Google
- [ ] Permisos de notificaciones concedidos
- [ ] Token FCM visible en logs
- [ ] Token guardado en `client_devices` (Supabase)
- [ ] Notificación push recibida con app cerrada
- [ ] Notificación visible en centro de notificaciones

## 📝 Notas Importantes

- **NO** mezclar código nativo con Capacitor
- **SOLO** usar `@capacitor/push-notifications`
- El token se registra **automáticamente** después del login
- Las notificaciones funcionan con la app **cerrada** y **pantalla bloqueada**

