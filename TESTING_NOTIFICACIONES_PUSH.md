# 🧪 Testing de Notificaciones Push - Android

## ✅ Estado Actual

- ✅ Token FCM se registra correctamente en `client_devices`
- ✅ Permisos de notificaciones funcionan
- ✅ Canal de notificaciones se crea con importancia HIGH
- ⚠️ **PROBLEMA**: Notificaciones no aparecen en el sistema cuando la app está cerrada

## 🔧 Cambios Realizados

### 1. Mejora en la Creación del Canal (`src/utils/fcm.ts`)

- El canal `default_channel` ahora se crea con:
  - **Importancia**: HIGH (5) - Muestra notificaciones incluso con app cerrada y pantalla bloqueada
  - **Visibilidad**: PÚBLICA - Muestra contenido completo incluso en pantalla bloqueada
  - **Sonido**: default
  - **Vibración**: activada

- El canal se elimina y recrea cada vez para asegurar la configuración correcta

### 2. Orden de Operaciones Optimizado

1. Configurar listeners (ANTES de registrar)
2. Solicitar permisos
3. Crear canal de notificaciones (CRÍTICO)
4. Registrar para recibir token FCM

## 📋 Pasos para Probar

### Paso 1: Clean Build Completo

```powershell
# Desde la raíz del proyecto
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Paso 2: Abrir en Android Studio

```powershell
npx cap open android
```

### Paso 3: En Android Studio

1. **Build → Clean Project**
2. **Build → Rebuild Project**
3. **Desinstalar la app** del dispositivo físico (si está instalada)
4. **Run → Run 'app'**

### Paso 4: En el Dispositivo

1. **Abrir la app**
2. **Iniciar sesión con Google**
3. **Aceptar permisos de notificaciones** cuando se soliciten
4. **Verificar logs** en Logcat:
   - Buscar `[FCM]` en los logs
   - Debe aparecer: `✅✅✅ Canal de notificaciones creado exitosamente ✅✅✅`
   - Debe aparecer: `✅✅✅ TOKEN GUARDADO EXITOSAMENTE EN SUPABASE ✅✅✅`

### Paso 5: Verificar en Supabase

```sql
SELECT * FROM client_devices 
WHERE user_id = 'TU_USER_ID';
```

Debe existir al menos un registro con:
- `fcm_token`: Token válido (142 caracteres)
- `platform`: 'android'
- `user_id`: Tu ID de usuario

### Paso 6: Probar Notificación con App Cerrada

1. **Cerrar completamente la app** (no solo minimizar)
   - Swipe up desde la barra de navegación
   - Swipe la app hacia arriba para cerrarla completamente

2. **Bloquear la pantalla** del dispositivo

3. **Desde la app Partner**:
   - Confirmar una reservación del cliente
   - O cambiar el estado de una cita

4. **Verificar**:
   - La notificación debe aparecer en el **centro de notificaciones** del sistema
   - Debe aparecer incluso con la pantalla bloqueada
   - Debe hacer sonido y vibrar

## 🔍 Verificación de Logs

### Logs Esperados en Logcat (filtro: `[FCM]`)

```
[FCM] ===== INICIANDO REGISTRO FCM =====
[FCM] Platform: android
[FCM] isNativePlatform(): true
[FCM] userId: [TU_USER_ID]
[FCM] 📡 Configurando listeners...
[FCM] ✅ Listeners configurados correctamente
[FCM] 🔐 Solicitando permisos de notificaciones...
[FCM] Resultado de permisos: { "receive": "granted" }
[FCM] ✅ Permisos concedidos
[FCM] 📢 Creando canal de notificaciones "default_channel"...
[FCM] 🔄 Canal anterior eliminado (si existía)
[FCM] ✅✅✅ Canal de notificaciones creado exitosamente ✅✅✅
[FCM] Canal ID: default_channel
[FCM] Importancia: HIGH (5)
[FCM] Visibilidad: PÚBLICA
[FCM] 📝 Llamando a PushNotifications.register()...
[FCM] ✅ PushNotifications.register() llamado exitosamente
[FCM] ===== TOKEN FCM RECIBIDO =====
[FCM] Token completo: [TOKEN_COMPLETO]
[FCM] ✅ Sesión verificada, guardando token...
[FCM] ✅✅✅ TOKEN GUARDADO EXITOSAMENTE EN SUPABASE ✅✅✅
[FCM] ✅✅✅ INICIALIZACIÓN FCM COMPLETADA ✅✅✅
```

## 🐛 Troubleshooting

### Problema: El canal no se crea

**Síntomas**: No aparece el log `✅✅✅ Canal de notificaciones creado exitosamente`

**Solución**:
1. Verificar que `@capacitor/local-notifications` esté instalado
2. Verificar permisos de notificaciones
3. Revisar errores en Logcat

### Problema: Token no se guarda en Supabase

**Síntomas**: `client_devices` está vacía

**Solución**:
1. Verificar sesión activa en Supabase
2. Verificar RLS policies en `client_devices`
3. Revisar logs de error en Logcat

### Problema: Notificaciones no aparecen cuando la app está cerrada

**Síntomas**: Las notificaciones solo aparecen cuando abres la app

**Posibles causas**:
1. **Canal no existe**: Verificar que el canal se creó correctamente
2. **Importancia baja**: El canal debe tener importancia HIGH (5)
3. **App no cerrada completamente**: Asegurarse de cerrar la app completamente (swipe up)
4. **Modo Doze activo**: Algunos dispositivos tienen modo Doze que puede bloquear notificaciones
5. **Configuración del dispositivo**: Verificar que las notificaciones de la app no estén deshabilitadas en Configuración → Apps → Bookwise → Notificaciones

**Verificación**:
1. Ir a **Configuración → Apps → Bookwise → Notificaciones**
2. Verificar que:
   - Las notificaciones estén **habilitadas**
   - El canal "Notificaciones" tenga importancia **Alta**
   - No esté en modo "No molestar"

### Problema: Notificaciones aparecen pero sin sonido/vibración

**Solución**:
1. Verificar configuración del canal (debe tener `sound: 'default'` y `vibration: true`)
2. Verificar configuración del dispositivo (volumen, modo silencioso)

## 📱 Verificación en Configuración del Dispositivo

1. **Configuración → Apps → Bookwise → Notificaciones**
   - Debe estar habilitado
   - Debe existir el canal "Notificaciones" con importancia **Alta**

2. **Configuración → Notificaciones → Bookwise**
   - Verificar que no esté en modo "No molestar"
   - Verificar que el sonido esté habilitado

## 🎯 Resultado Esperado

Cuando una notificación push llega desde el backend:

1. ✅ Aparece en el **centro de notificaciones** del sistema Android
2. ✅ Aparece incluso con la **app cerrada completamente**
3. ✅ Aparece incluso con la **pantalla bloqueada**
4. ✅ Hace **sonido** y **vibra** (según configuración del dispositivo)
5. ✅ Al hacer clic, **abre la app** y muestra la notificación

## 📝 Notas Importantes

- El canal `default_channel` **DEBE** existir antes de recibir notificaciones push
- Si el canal no existe cuando llega una notificación, Android la ignora o usa un canal por defecto con baja importancia
- El canal se crea automáticamente al iniciar sesión
- El canal se recrea cada vez para asegurar la configuración correcta

## 🔗 Referencias

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/send-message)

