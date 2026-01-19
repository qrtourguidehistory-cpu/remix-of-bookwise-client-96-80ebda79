# 🔧 SOLUCIÓN: google-services.json con oauth_client vacío

## ❌ PROBLEMA ACTUAL

Tu archivo `google-services.json` tiene:
```json
"oauth_client": []
```

Esto significa que **Firebase NO ha generado los clientes OAuth** necesarios para Google Sign-In.

## 🔍 CAUSA RAÍZ

El SHA-1 del keystore **NO está registrado en Firebase**. Sin el SHA-1, Firebase no puede generar los clientes OAuth necesarios.

---

## ✅ SOLUCIÓN PASO A PASO

### PASO 1: Registrar SHA-1 en Firebase Console

1. Ve a **Firebase Console**: https://console.firebase.google.com/
2. Selecciona tu proyecto: **mi-turnow-cliente**
3. Ve a **⚙️ Configuración del proyecto** → **Tus apps**
4. Haz clic en tu app Android: **com.miturnow.cliente**
5. En la sección **"Huellas digitales del certificado SHA"**:
   - Haz clic en **"Agregar huella digital"**
   - Pega el SHA-1: `67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15`
   - Haz clic en **"Guardar"**

### PASO 2: Si estás probando con DEBUG, también agrega el SHA-1 de debug

Si estás probando con un build de debug (desde Android Studio), también necesitas el SHA-1 del debug keystore:

```powershell
# Obtener SHA-1 del debug keystore (default de Android)
& 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe' -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -alias androiddebugkey
```

### PASO 3: Descargar el NUEVO google-services.json

Después de agregar el SHA-1:

1. En Firebase Console, ve a **⚙️ Configuración del proyecto** → **Tus apps** → **Android**
2. Haz clic en el ícono de **descargar** junto a `google-services.json`
3. **Reemplaza** el archivo en `android/app/google-services.json`
4. El nuevo archivo debería tener `oauth_client` con entradas, no vacío

### PASO 4: Limpiar y reconstruir

```powershell
# Limpiar build
cd android
.\gradlew clean

# Volver al root
cd ..

# Sincronizar Capacitor
npx @capacitor/cli sync android
```

### PASO 5: Verificar el nuevo google-services.json

Abre `android/app/google-services.json` y verifica que ahora tenga algo como:

```json
"oauth_client": [
  {
    "client_id": "194250427972-XXXXX.apps.googleusercontent.com",
    "client_type": 1,
    "android_info": {
      "package_name": "com.miturnow.cliente",
      "certificate_hash": "67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15"
    }
  },
  {
    "client_id": "194250427972-XXXXX.apps.googleusercontent.com",
    "client_type": 3
  }
]
```

---

## 🐛 DIAGNÓSTICO ADICIONAL

### Verificar en Logcat

1. Abre Android Studio
2. Abre **Logcat**
3. Filtra por `Google` o `SocialLogin`
4. Busca errores relacionados con:
   - `OAuth client not found`
   - `SHA-1 not registered`
   - `oauth_client empty`

### Verificar que el plugin de Google Services esté aplicado

Después de agregar `google-services.json`, verifica en los logs de Gradle que veas:
```
> Task :app:processReleaseGoogleServices
```

---

## ✅ VERIFICACIÓN FINAL

Después de seguir estos pasos:

1. ✅ SHA-1 registrado en Firebase (Release)
2. ✅ SHA-1 registrado en Firebase (Debug, si pruebas en debug)
3. ✅ Nuevo `google-services.json` descargado con `oauth_client` lleno
4. ✅ Archivo colocado en `android/app/google-services.json`
5. ✅ Proyecto limpiado y reconstruido
6. ✅ Capacitor sincronizado

---

## 📋 DATOS IMPORTANTES

- **SHA-1 Release**: `67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15`
- **Package Name**: `com.miturnow.cliente`
- **Project ID**: `mi-turnow-cliente`
- **Firebase Project**: https://console.firebase.google.com/project/mi-turnow-cliente

---

## ⚠️ NOTA IMPORTANTE

**Sin el SHA-1 registrado, Firebase NO generará los clientes OAuth necesarios**, por eso el `oauth_client` está vacío. Este es el problema principal que está causando que Google Sign-In no funcione.

