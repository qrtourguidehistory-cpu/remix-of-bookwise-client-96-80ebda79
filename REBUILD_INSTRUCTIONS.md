# Instrucciones para Rebuild Limpio de Android

## Pasos Obligatorios

### 1. Verificar google-services.json

```bash
# Verificar que existe el archivo correcto
cd android/app
ls google-services.json
```

Si no existe, copiar desde `google-services.json.json`:
```bash
cp google-services.json.json google-services.json
```

### 2. Limpiar Proyecto Android

```bash
cd android
./gradlew clean
```

En Windows:
```bash
cd android
gradlew.bat clean
```

### 3. Sincronizar Capacitor

```bash
cd ..
npx cap sync android
```

### 4. Rebuild del Proyecto

```bash
cd android
./gradlew assembleDebug
```

En Windows:
```bash
cd android
gradlew.bat assembleDebug
```

### 5. Desinstalar App Anterior

```bash
adb uninstall com.bookwise.client
```

### 6. Instalar Nueva Versión

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 7. Verificar Logs

```bash
# Ver todos los logs de FCM
adb logcat | grep -E "FCMTokenManager|BookwiseFCMService|FCMTokenPlugin|MainActivity"

# O ver todos los logs
adb logcat
```

## Verificación Post-Instalación

1. **Abrir la app** - Deberías ver logs de `MainActivity.onCreate()` y `FCMTokenManager.getFCMToken()`

2. **Iniciar sesión con Google** - Deberías ver:
   - `syncTokenAfterLogin llamado desde JS`
   - `USUARIO LOGEADO, SINCRONIZANDO TOKEN`
   - `ENVIANDO TOKEN A BACKEND`
   - `TOKEN REGISTRADO EXITOSAMENTE`

3. **Verificar en Supabase** - La tabla `client_devices` debe tener al menos 1 fila

## Comandos Rápidos (Windows PowerShell)

```powershell
# Limpiar y rebuild
cd android
.\gradlew.bat clean
cd ..
npx cap sync android
cd android
.\gradlew.bat assembleDebug

# Desinstalar e instalar
adb uninstall com.bookwise.client
adb install app\build\outputs\apk\debug\app-debug.apk

# Ver logs
adb logcat | Select-String -Pattern "FCM|Token"
```

## Troubleshooting

**Error: google-services.json not found**
- Copiar `google-services.json.json` a `google-services.json`
- Verificar que está en `android/app/`

**Error: Plugin not found**
- Ejecutar `npx cap sync android`
- Verificar que `FCMTokenPlugin` está en `capacitor.plugins.json`

**Error: Build failed**
- Limpiar: `./gradlew clean`
- Verificar que todas las dependencias están en `build.gradle`

**Token no se genera**
- Verificar que `google-services.json` es válido
- Verificar permisos de notificaciones en Android 13+
- Verificar que Firebase está configurado en Firebase Console

