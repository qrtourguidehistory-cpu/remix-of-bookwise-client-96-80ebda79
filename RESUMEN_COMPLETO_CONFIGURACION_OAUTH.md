# 📋 RESUMEN COMPLETO: Configuración OAuth - Mi Turnow Cliente

## 🎯 OBJETIVO
Configurar OAuth con Google y Apple usando Supabase + Capacitor para autenticación en la app Android/iOS.

---

## 📁 ARCHIVOS MODIFICADOS/CREADOS

### 1. **Hook: `src/hooks/useCapacitorOAuth.ts`** ✅ CREADO

**Propósito:** Manejar OAuth con Supabase usando Capacitor Browser (solo OAuth web, sin Google Sign-In nativo).

**Código clave:**
```typescript
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export const useCapacitorOAuth = () => {
  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios';

    // Deep link EXACTO para callbacks OAuth
    const redirectTo = isNative
      ? 'com.miturnow.cliente://auth/callback'
      : `${window.location.origin}/`;

    // Obtener URL de OAuth de Supabase (CRÍTICO: skipBrowserRedirect: true OBLIGATORIO)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true, // OBLIGATORIO: Supabase NO debe abrir navegador automáticamente
      },
    });

    // Abrir URL en navegador SOLO con Browser.open() (en móvil)
    if (isNative) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: data.url });
    } else {
      // Web: redirigir directamente
      window.location.href = data.url;
    }
  };

  return { signInWithOAuth };
};
```

**Características importantes:**
- ✅ `skipBrowserRedirect: true` - Evita que Supabase abra el navegador automáticamente
- ✅ Deep link configurado: `com.miturnow.cliente://auth/callback`
- ✅ Logs de auditoría para verificar `redirect_uri` en la URL de OAuth
- ✅ Manejo de errores completo

---

### 2. **Hook: `src/hooks/useDeepLinks.ts`** ✅ MODIFICADO

**Propósito:** Capturar deep links de OAuth y procesar callbacks.

**Cambios principales:**

1. **Detección de callback OAuth:**
```typescript
// Detectar callback OAuth por contenido de URL
if (event.url.includes('/auth/callback')) {
  console.log('✅ Callback OAuth detectado:', event.url);
  await handleOAuthCallback(event.url, supabase, navigate);
  return;
}
```

2. **Función `handleOAuthCallback`:**
```typescript
const handleOAuthCallback = async (url: string, supabase: any, navigate: any) => {
  // Extraer tokens del hash (método estándar de Supabase)
  let hashParams: URLSearchParams | null = null;
  const hashMatch = url.match(/#([^#]+)$/);
  if (hashMatch) {
    hashParams = new URLSearchParams(hashMatch[1]);
  } else {
    // Si no hay hash, intentar query parameters
    const urlObj = new URL(url);
    if (urlObj.search) {
      hashParams = new URLSearchParams(urlObj.search);
    }
  }

  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const errorParam = hashParams.get('error');

  // Verificar errores de OAuth
  if (errorParam) {
    console.error('❌ Error en callback OAuth:', errorParam);
    return false;
  }

  // Establecer la sesión con los tokens
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // CRÍTICO: Usar getSession() para recuperar la sesión completa
  const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

  if (session && session.user) {
    console.log('✅ Sesión recuperada exitosamente');
    return true;
  }
};
```

3. **Listeners configurados:**
- `appUrlOpen` - Captura deep links cuando la app está abierta
- `appStateChange` - Captura deep links cuando la app se activa
- `getLaunchUrl()` - Captura deep links al iniciar la app

---

### 3. **Context: `src/contexts/AuthContext.tsx`** ✅ MODIFICADO

**Cambios principales:**

1. **Importación del hook OAuth:**
```typescript
import { useCapacitorOAuth } from '@/hooks/useCapacitorOAuth';

// Dentro del componente
const { signInWithOAuth } = useCapacitorOAuth();
```

2. **Función `signInWithGoogle`:**
```typescript
const signInWithGoogle = async () => {
  // Usar OAuth de Supabase exclusivamente (igual que Partner)
  return await signInWithOAuth('google');
};
```

3. **Función `signInWithApple`:**
```typescript
const signInWithApple = async () => {
  // Usar OAuth de Supabase exclusivamente (igual que Partner)
  return await signInWithOAuth('apple');
};
```

4. **Listener de autenticación mejorado:**
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Inicializar push notifications SOLO después del login
      setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          initPushNotifications(session.user.id).catch((err) => {
            console.error('Error al inicializar push notifications:', err);
          });
        }
      }, 500);
    }
  }
);
```

---

### 4. **Manifest Android: `android/app/src/main/AndroidManifest.xml`** ✅ MODIFICADO

**Cambios principales:**

1. **Deep Link Intent Filter agregado:**
```xml
<!-- Deep Link Intent Filter for OAuth callbacks (Supabase) -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="com.miturnow.cliente"
        android:host="auth"
        android:pathPrefix="/callback" />
</intent-filter>
```

**Configuración completa:**
- **Scheme:** `com.miturnow.cliente`
- **Host:** `auth`
- **Path Prefix:** `/callback`
- **URL completa:** `com.miturnow.cliente://auth/callback`

---

## 🔧 CONFIGURACIONES EXTERNAS

### 1. **Supabase Dashboard** ⚙️

**URL:** https://supabase.com/dashboard/project/rdznelijpliklisnflfm

#### A. **Authentication → URL Configuration**

**Site URL:**
```
https://rdznelijpliklisnflfm.supabase.co
```

**Redirect URLs (debe incluir):**
```
com.miturnow.cliente://auth/callback
```

#### B. **Authentication → Providers → Google**

**Configuración:**
- ✅ **Enable Google provider:** Activado
- ✅ **Client ID (for OAuth):** `762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa.apps.googleusercontent.com`
- ✅ **Client Secret:** Configurado correctamente

#### C. **Authentication → Providers → Apple**

**Configuración:**
- ✅ **Enable Apple provider:** Activado
- ✅ **Client ID, Team ID, Key ID, Private Key:** Configurados

---

### 2. **Firebase Console** 🔥

**URL:** https://console.firebase.google.com/project/mi-turnow-cliente

#### A. **Configuración del proyecto → Tus apps → Android**

**Package Name:**
```
com.miturnow.cliente
```

**SHA-1 (Release):**
```
67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15
```

**SHA-1 (Debug):**
```
[Obtener con: keytool -list -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey]
```

**Archivo descargado:**
```
android/app/google-services.json
```

#### B. **Verificación de `google-services.json`**

**Debe contener:**
```json
{
  "project_info": {
    "project_number": "194250427972",
    "project_id": "mi-turnow-cliente"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "...",
        "android_client_info": {
          "package_name": "com.miturnow.cliente"
        }
      },
      "oauth_client": [
        {
          "client_id": "194250427972-XXXXX.apps.googleusercontent.com",
          "client_type": 1,
          "android_info": {
            "package_name": "com.miturnow.cliente",
            "certificate_hash": "67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15"
          }
        }
      ]
    }
  ]
}
```

**⚠️ IMPORTANTE:** El array `oauth_client` NO debe estar vacío `[]`. Si está vacío:
1. Verificar que el SHA-1 esté registrado en Firebase
2. Habilitar APIs en Google Cloud Console (ver siguiente sección)
3. Descargar nuevamente `google-services.json`

---

### 3. **Google Cloud Console** ☁️

**URL:** https://console.cloud.google.com/

**Proyecto:** `mi-turnow-cliente` (Project ID: `mi-turnow-cliente`, Project Number: `194250427972`)

#### A. **APIs & Services → Library**

**APIs que deben estar habilitadas:**
- ✅ **Google Sign-In API**
- ✅ **Identity Toolkit API**
- ✅ **Google+ API** (si está disponible)

#### B. **APIs & Services → Credentials**

**OAuth 2.0 Client ID (Web):**
```
762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa.apps.googleusercontent.com
```

**Authorized redirect URIs (debe incluir):**
```
https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback
```

**⚠️ NO debe incluir:**
- `https://www.miturnow.com` (a menos que sea necesario para web)
- `https://turnow.com` (a menos que sea necesario para web)

---

## 📦 DEPENDENCIAS INSTALADAS

### Package.json

```json
{
  "dependencies": {
    "@capacitor/browser": "^7.0.0",
    "@capacitor/app": "^7.0.0",
    "@supabase/supabase-js": "^2.86.2"
  }
}
```

**Comandos de instalación:**
```bash
npm install @capacitor/browser @capacitor/app
npx cap sync android
npx cap sync ios
```

---

## 🔄 FLUJO DE AUTENTICACIÓN OAuth

### Flujo completo:

1. **Usuario hace clic en "Iniciar sesión con Google"**
   - Se llama a `signInWithGoogle()` en `AuthContext`
   - Se llama a `signInWithOAuth('google')` en `useCapacitorOAuth`

2. **Generación de URL OAuth:**
   - Supabase genera URL de OAuth con `skipBrowserRedirect: true`
   - URL incluye `redirect_uri=com.miturnow.cliente://auth/callback`
   - Se abre la URL en `Browser.open()` de Capacitor

3. **Usuario selecciona cuenta en Google:**
   - Google redirige a Supabase: `https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback?code=...`
   - Supabase procesa el código y genera tokens
   - Supabase redirige al deep link: `com.miturnow.cliente://auth/callback#access_token=...&refresh_token=...`

4. **Captura del deep link:**
   - `useDeepLinks` detecta el deep link con `appUrlOpen` o `getLaunchUrl()`
   - Se llama a `handleOAuthCallback()` con la URL completa

5. **Procesamiento del callback:**
   - Se extraen `access_token` y `refresh_token` del hash
   - Se establece la sesión con `supabase.auth.setSession()`
   - Se recupera la sesión completa con `supabase.auth.getSession()`

6. **Actualización del estado:**
   - `onAuthStateChange` detecta el evento `SIGNED_IN`
   - Se actualiza el estado de `user` y `session` en `AuthContext`
   - Se inicializan push notifications

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema 1: OAuth redirige a dominio web en lugar de la app

**Causa:** Site URL incorrecto en Supabase Dashboard

**Solución:**
1. Ir a Supabase Dashboard → Authentication → URL Configuration
2. Verificar que **Site URL** sea: `https://rdznelijpliklisnflfm.supabase.co`
3. Verificar que **Redirect URLs** incluya: `com.miturnow.cliente://auth/callback`

---

### Problema 2: `oauth_client` vacío en `google-services.json`

**Causa:** SHA-1 no registrado o APIs no habilitadas

**Solución:**
1. Registrar SHA-1 en Firebase Console
2. Habilitar APIs en Google Cloud Console (Google Sign-In API, Identity Toolkit API)
3. Descargar nuevamente `google-services.json`
4. Verificar que `oauth_client` tenga entradas

---

### Problema 3: Login se queda colgado después de seleccionar cuenta

**Causa:** Deep link no se captura correctamente

**Solución:**
1. Verificar que `AndroidManifest.xml` tenga el intent-filter correcto
2. Verificar que `useDeepLinks` esté configurado en el componente raíz
3. Revisar logs en Logcat para ver si el deep link se recibe

---

### Problema 4: `redirect_uri` incorrecto en URL de OAuth

**Causa:** Configuración incorrecta en Supabase

**Solución:**
1. Los logs de `useCapacitorOAuth` mostrarán el `redirect_uri` en la URL
2. Si no es `com.miturnow.cliente://auth/callback`, verificar configuración de Supabase
3. Verificar que `redirectTo` se pase correctamente a `signInWithOAuth()`

---

## 📝 LOGS DE DEBUGGING

### Logs importantes a revisar:

```javascript
// En useCapacitorOAuth.ts
🔐 Iniciando OAuth con google...
🔐 Platform: android, isNative: true
🔐 redirectTo: com.miturnow.cliente://auth/callback
✅ URL de OAuth generada para google
🔍 AUDITORÍA OAuth:
  - redirectTo enviado a Supabase: com.miturnow.cliente://auth/callback
  - redirect_uri en URL de OAuth: com.miturnow.cliente://auth/callback

// En useDeepLinks.ts
🔗 DEEP LINK RECIBIDO: com.miturnow.cliente://auth/callback#access_token=...
✅ Callback OAuth detectado: com.miturnow.cliente://auth/callback#...
🔐 ===== MANEJANDO CALLBACK OAUTH =====
✅ Tokens encontrados: { type: 'token', hasAccessToken: true, hasRefreshToken: true }
✅ Sesión establecida con setSession
✅ Sesión recuperada exitosamente con getSession()

// En AuthContext.tsx
🔐 AuthContext: Evento de autenticación: SIGNED_IN
✅ AuthContext: SIGNED_IN detectado, usuario: usuario@example.com
✅ AuthContext: Iniciando push notifications después de SIGNED_IN...
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Configuración de Código:
- [x] `useCapacitorOAuth.ts` creado y configurado
- [x] `useDeepLinks.ts` actualizado con manejo de callbacks OAuth
- [x] `AuthContext.tsx` usa `useCapacitorOAuth` para Google/Apple
- [x] `AndroidManifest.xml` tiene intent-filter para deep links
- [x] Dependencias instaladas (`@capacitor/browser`, `@capacitor/app`)

### Configuración de Supabase:
- [x] Site URL configurado: `https://rdznelijpliklisnflfm.supabase.co`
- [x] Redirect URL agregado: `com.miturnow.cliente://auth/callback`
- [x] Google provider habilitado con Client ID correcto
- [x] Apple provider habilitado (si se usa)

### Configuración de Firebase:
- [x] SHA-1 registrado en Firebase Console
- [x] `google-services.json` descargado y colocado en `android/app/`
- [x] `oauth_client` en `google-services.json` NO está vacío

### Configuración de Google Cloud:
- [x] APIs habilitadas (Google Sign-In API, Identity Toolkit API)
- [x] OAuth 2.0 Client ID configurado
- [x] Authorized redirect URIs incluye: `https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback`

---

## 📚 REFERENCIAS

- **Documentación Supabase OAuth:** https://supabase.com/docs/guides/auth/social-login
- **Documentación Capacitor Browser:** https://capacitorjs.com/docs/apis/browser
- **Documentación Capacitor App:** https://capacitorjs.com/docs/apis/app
- **Deep Links Android:** https://developer.android.com/training/app-links/deep-linking

---

## 🎯 RESUMEN FINAL

**Estrategia implementada:**
- ✅ OAuth web exclusivamente (sin Google Sign-In nativo)
- ✅ Deep links para callbacks: `com.miturnow.cliente://auth/callback`
- ✅ Capacitor Browser para abrir OAuth flow
- ✅ `skipBrowserRedirect: true` para control manual del navegador
- ✅ Extracción de tokens del hash de la URL
- ✅ Establecimiento de sesión con `setSession()` y `getSession()`

**Archivos clave:**
1. `src/hooks/useCapacitorOAuth.ts` - Manejo de OAuth
2. `src/hooks/useDeepLinks.ts` - Captura de deep links
3. `src/contexts/AuthContext.tsx` - Integración con OAuth
4. `android/app/src/main/AndroidManifest.xml` - Configuración de deep links

**Configuraciones externas:**
1. Supabase Dashboard - Site URL y Redirect URLs
2. Firebase Console - SHA-1 y google-services.json
3. Google Cloud Console - APIs y OAuth Client ID

---

**Fecha de creación:** 2024
**Última actualización:** 2024
**Estado:** ✅ COMPLETADO Y FUNCIONANDO

