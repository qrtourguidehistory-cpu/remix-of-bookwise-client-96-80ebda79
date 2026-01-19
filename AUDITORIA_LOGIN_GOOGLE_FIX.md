# 🔍 Auditoría Login Google - Página en Blanco en Navegador

## ❌ Problema Identificado

Al iniciar sesión con Google, el navegador muestra una página en blanco con URL `nffm.supabase.co` (o similar subdominio de Supabase), y no redirige correctamente a la app.

## 🔍 Causas Posibles

### 1. **Redirect URL no configurado en Supabase Dashboard** 🔴 CRÍTICO

El redirect URL `com.miturnow.cliente://login-callback` **DEBE** estar configurado en Supabase Dashboard para que funcione.

**Solución:**
1. Ve a: https://supabase.com/dashboard/project/[TU_PROJECT_ID]/auth/url-configuration
2. En la sección **Redirect URLs**, agrega:
   - `com.miturnow.cliente://login-callback`
   - `https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback`
3. Haz clic en **Save**

### 2. **AndroidManifest no captura todos los subdominios de Supabase**

El `intent-filter` en `AndroidManifest.xml` solo captura `rdznelijpliklisnflfm.supabase.co`, pero puede haber redirecciones a otros subdominios.

**Solución:** ✅ CORREGIDO
- Se agregó un `intent-filter` con `android:host="*.supabase.co"` para capturar cualquier subdominio
- Se mantiene el `intent-filter` específico como backup

### 3. **Browser.open() no maneja correctamente deep links**

Cuando Supabase intenta redirigir a `com.miturnow.cliente://login-callback`, el navegador puede no manejarlo correctamente.

**Verificación:**
- El código usa `Browser.open()` de `@capacitor/browser` que debería manejar deep links
- El `AndroidManifest` tiene el `intent-filter` correcto para `com.miturnow.cliente://*`

## ✅ Archivos Modificados

1. **`android/app/src/main/AndroidManifest.xml`**
   - Agregado `intent-filter` con `android:host="*.supabase.co"` para capturar cualquier subdominio de Supabase
   - Mantiene el `intent-filter` específico como backup

## 📋 Pasos de Verificación

### 1. Verificar Redirect URLs en Supabase

1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Verifica que `com.miturnow.cliente://login-callback` esté en la lista de **Redirect URLs**
3. Si no está, agrégalo y guarda

### 2. Verificar Logs de la App

Revisa los logs de la consola de Android Studio o `adb logcat` para ver:
- `🔐 ===== MANEJANDO CALLBACK OAUTH =====`
- `🔐 URL recibida:`
- Si hay errores de parsing de URL

### 3. Verificar que Deep Links funcionen

Prueba manualmente si el deep link funciona:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "com.miturnow.cliente://login-callback#access_token=test&refresh_token=test" com.miturnow.cliente
```

### 4. Verificar Browser Plugin

Asegúrate de que `@capacitor/browser` esté instalado y sincronizado:
```bash
npm install @capacitor/browser
npx cap sync android
```

## 🔧 Solución Temporal

Si el problema persiste después de configurar el redirect URL en Supabase, intenta:

1. **Usar HTTPS callback en lugar de deep link:**
   ```typescript
   const redirectTo = 'https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback';
   ```

2. **Verificar que el navegador esté cerrado después de OAuth:**
   El plugin `@capacitor/browser` debería cerrar el navegador automáticamente cuando detecta el deep link, pero si no funciona, puede necesitarse un timeout o un listener adicional.

## 📝 Notas

- El URL `nffm.supabase.co` que se muestra puede ser un proxy o redirect interno de Supabase
- El `intent-filter` con `*.supabase.co` debería capturar cualquier subdominio
- El flujo correcto es: Google → Supabase (`*.supabase.co/auth/v1/callback`) → Deep Link (`com.miturnow.cliente://login-callback`)



