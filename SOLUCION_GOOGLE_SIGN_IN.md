# 🔧 SOLUCIÓN: Google Sign-In se queda colgado en Android

## ❌ PROBLEMAS ENCONTRADOS

1. **`google-services.json` NO EXISTE** - Este archivo es CRÍTICO para Google Sign-In en Android
2. **SHA-1 del keystore puede no estar registrado en Firebase**
3. **Configuración OAuth en Supabase puede estar incorrecta**

---

## ✅ SOLUCIÓN PASO A PASO

### PASO 1: Obtener `google-services.json` desde Firebase Console

1. Ve a **Firebase Console**: https://console.firebase.google.com/
2. Selecciona tu proyecto (o créalo si no existe)
3. Ve a **⚙️ Configuración del proyecto** → **Tus apps**
4. Si NO tienes una app Android:
   - Haz clic en **Agregar app** → **Android**
   - **Nombre del paquete Android**: `com.miturnow.cliente`
   - **Alias de la app** (opcional): `Bookwise Cliente`
   - Haz clic en **Registrar app**

5. **Agregar SHA-1** (IMPORTANTE):
   - En la configuración de la app Android, haz clic en **Agregar huella digital**
   - Pega tu SHA-1: `67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15`
   - Haz clic en **Guardar**

6. **Descargar `google-services.json`**:
   - Descarga el archivo `google-services.json`
   - **Cópialo a**: `android/app/google-services.json`

---

### PASO 2: Verificar configuración de OAuth en Supabase

1. Ve a **Supabase Dashboard**: https://supabase.com/dashboard/project/rdznelijpliklisnflfm
2. Ve a **Authentication** → **Providers** → **Google**
3. Verifica que:
   - ✅ **Enable Google provider**: Activado
   - ✅ **Client ID (for OAuth)**: `762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa.apps.googleusercontent.com`
   - ✅ **Client Secret**: Está configurado correctamente

4. En **Redirect URLs**, asegúrate de tener:
   ```
   com.miturnow.cliente://login-callback
   ```

---

### PASO 3: Verificar configuración en Google Cloud Console

1. Ve a **Google Cloud Console**: https://console.cloud.google.com/
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Busca el **OAuth 2.0 Client ID** con ID: `762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa`
5. Verifica que en **Authorized redirect URIs** esté:
   ```
   com.miturnow.cliente://login-callback
   ```
6. En **SHA-1 certificate fingerprints**, verifica que esté:
   ```
   67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15
   ```

---

### PASO 4: Limpiar y reconstruir el proyecto Android

Después de agregar `google-services.json`, ejecuta:

```powershell
# Limpiar build anterior
cd android
.\gradlew clean

# Volver al root y sincronizar Capacitor
cd ..
npx @capacitor/cli sync android

# Reconstruir en Android Studio
```

---

## 📋 DATOS IMPORTANTES DE TU APP

- **Application ID**: `com.miturnow.cliente`
- **SHA-1 (Release Keystore)**: `67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15`
- **SHA-256**: `C0:89:FE:43:26:70:07:6C:F3:E0:1C:D1:26:63:64:2C:EB:0D:E8:15:31:4C:22:65:47:A7:92:CC:85:A6:E3:F1`
- **Google Web Client ID**: `762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa.apps.googleusercontent.com`
- **Keystore Path**: `C:\Users\laptop\Desktop\LLAVE CLIENTE TURNOW\llave_cliente_miturnow.jks`
- **Keystore Alias**: `cliente_prod`

---

## 🐛 DIAGNÓSTICO

Si después de seguir estos pasos aún no funciona, revisa:

1. **Logs de Android Studio**:
   - Abre **Logcat** en Android Studio
   - Filtra por `Google` o `SocialLogin`
   - Busca errores relacionados con autenticación

2. **Verificar que `google-services.json` esté en el lugar correcto**:
   ```powershell
   Test-Path "android\app\google-services.json"
   ```
   Debe devolver `True`

3. **Verificar que el plugin de Google Services esté aplicado**:
   - El archivo `android/app/build.gradle` tiene un bloque que verifica si `google-services.json` existe
   - Después de agregar el archivo, debe aplicar automáticamente el plugin

---

## ✅ VERIFICACIÓN FINAL

Después de completar los pasos:

1. ✅ `google-services.json` existe en `android/app/`
2. ✅ SHA-1 registrado en Firebase
3. ✅ SHA-1 registrado en Google Cloud Console
4. ✅ OAuth configurado en Supabase
5. ✅ Redirect URI configurado correctamente
6. ✅ Proyecto limpiado y reconstruido

Si todo está bien, Google Sign-In debería funcionar correctamente.

