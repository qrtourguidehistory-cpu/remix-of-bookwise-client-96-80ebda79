# 🔍 AUDITORÍA: OAuth Redirect al Dominio Web

## ❌ PROBLEMA REPORTADO

Cuando el usuario selecciona una cuenta de Google, Supabase redirige a un dominio web (probablemente `www.miturnow.com` o `turnow.com`) en lugar de volver a la app con el deep link `com.miturnow.cliente://auth/callback`.

## 🔍 CAUSAS POSIBLES

### 1. **Configuración de Supabase Dashboard (MÁS PROBABLE)** 🔴

**Site URL configurado incorrectamente:**
- Si el **Site URL** en Supabase Dashboard está configurado como `https://www.miturnow.com` o `https://turnow.com`, Supabase puede estar usando ese como fallback en lugar del `redirectTo` que pasamos.

**Solución:**
1. Ve a: **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Verifica el **Site URL**:
   - ✅ **CORRECTO:** `https://rdznelijpliklisnflfm.supabase.co`
   - ❌ **INCORRECTO:** `https://www.miturnow.com` o `https://turnow.com`
3. Si está incorrecto, cámbialo a: `https://rdznelijpliklisnflfm.supabase.co`
4. Guarda los cambios

**Redirect URLs:**
- Asegúrate de que `com.miturnow.cliente://auth/callback` esté en la lista de **Redirect URLs**
- Si no está, agrégalo y guarda

### 2. **Google Cloud Console - Redirect URIs** 🟡

**Redirect URIs en Google Cloud Console:**
- Si Google Cloud Console tiene configurado `https://www.miturnow.com` como redirect URI autorizado, Google puede estar redirigiendo ahí.

**Solución:**
1. Ve a: **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Busca el **OAuth 2.0 Client ID**: `762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa`
3. Verifica los **Authorized redirect URIs**:
   - ✅ Debe incluir: `https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback`
   - ❌ NO debe incluir: `https://www.miturnow.com` o `https://turnow.com` (a menos que sea necesario para web)
4. Si hay redirect URIs incorrectos, elimínalos o ajústalos

### 3. **URL de OAuth generada por Supabase** 🟡

**Problema:**
- La URL de OAuth que genera Supabase puede tener un `redirect_uri` incorrecto en los query parameters.

**Verificación:**
- Los logs ahora mostrarán el `redirect_uri` en la URL de OAuth
- Si el `redirect_uri` no es `com.miturnow.cliente://auth/callback`, entonces el problema está en la configuración de Supabase

### 4. **Browser Plugin no captura el deep link** 🟡

**Problema:**
- El plugin `@capacitor/browser` puede no estar cerrando el navegador correctamente cuando Supabase intenta redirigir al deep link.

**Solución:**
- Verificar que `@capacitor/browser` esté instalado y sincronizado
- El deep link debería ser capturado por `useDeepLinks.ts` automáticamente

## ✅ VERIFICACIONES REALIZADAS EN EL CÓDIGO

### 1. `useCapacitorOAuth.ts`
- ✅ `redirectTo: 'com.miturnow.cliente://auth/callback'` configurado correctamente
- ✅ `skipBrowserRedirect: true` presente
- ✅ Logs agregados para auditar el `redirect_uri` en la URL de OAuth

### 2. `useDeepLinks.ts`
- ✅ Detecta `/auth/callback` en la URL
- ✅ Maneja correctamente el callback OAuth

### 3. `AndroidManifest.xml`
- ✅ Deep link configurado: `com.miturnow.cliente://auth/callback`
- ✅ `pathPrefix="/callback"` configurado

## 📋 PASOS PARA DIAGNOSTICAR

### 1. Revisar Logs de la App

Cuando inicies sesión con Google, revisa los logs en Android Studio (Logcat) o en la consola:

```
🔐 Iniciando OAuth con google...
🔐 redirectTo: com.miturnow.cliente://auth/callback
🔍 AUDITORÍA OAuth:
  - redirectTo enviado a Supabase: com.miturnow.cliente://auth/callback
  - redirect_uri en URL de OAuth: [AQUÍ DEBE APARECER EL DEEP LINK]
```

**Si el `redirect_uri` NO es `com.miturnow.cliente://auth/callback`:**
- El problema está en la configuración de Supabase Dashboard
- Verifica el **Site URL** y **Redirect URLs**

**Si el `redirect_uri` SÍ es `com.miturnow.cliente://auth/callback`:**
- El problema puede estar en Google Cloud Console o en cómo el navegador maneja el deep link

### 2. Verificar Configuración de Supabase

1. Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/auth/url-configuration
2. Verifica:
   - **Site URL:** Debe ser `https://rdznelijpliklisnflfm.supabase.co`
   - **Redirect URLs:** Debe incluir `com.miturnow.cliente://auth/callback`

### 3. Verificar Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Busca el OAuth Client ID: `762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa`
3. Verifica los **Authorized redirect URIs**

## 🔧 SOLUCIÓN TEMPORAL (Si el problema persiste)

Si después de verificar todo lo anterior el problema persiste, puedes intentar:

1. **Forzar el redirect_uri en la URL:**
   - Modificar la URL de OAuth antes de abrirla para asegurar que el `redirect_uri` sea correcto

2. **Usar HTTPS callback intermedio:**
   - Configurar Supabase para redirigir primero a `https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback`
   - Y luego capturar ese callback y redirigir manualmente al deep link

## 📝 NOTAS

- El código está correcto y debería funcionar si Supabase está configurado correctamente
- El problema más probable es la configuración del **Site URL** en Supabase Dashboard
- Los logs agregados ayudarán a identificar exactamente dónde está el problema

