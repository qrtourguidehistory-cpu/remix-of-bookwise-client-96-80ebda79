# 🔧 SOLUCIÓN: oauth_client vacío en google-services.json

## ❌ PROBLEMA

El archivo `google-services.json` tiene `oauth_client: []` vacío aunque el SHA-1 está registrado en Firebase.

## 🔍 CAUSA RAÍZ

Firebase **no genera automáticamente** los clientes OAuth en `google-services.json` si:

1. **Las APIs de Google no están habilitadas** en Google Cloud Console
2. **El proyecto de Google Cloud no está vinculado correctamente** con Firebase
3. **Google Sign-In API no está habilitada**

## ✅ SOLUCIÓN

### OPCIÓN 1: Habilitar APIs en Google Cloud Console (RECOMENDADO)

1. Ve a **Google Cloud Console**: https://console.cloud.google.com/
2. Selecciona el proyecto: **mi-turnow-cliente** (Project ID: `mi-turnow-cliente`, Project Number: `194250427972`)
3. Ve a **APIs & Services** → **Library**
4. Busca y **habilita** estas APIs:
   - ✅ **Google Sign-In API**
   - ✅ **Identity Toolkit API**
   - ✅ **Google+ API** (si está disponible)

5. **Espera 5-10 minutos** para que los cambios se propaguen

6. **Descarga NUEVAMENTE** el `google-services.json` desde Firebase Console:
   - Firebase Console → ⚙️ Configuración del proyecto → Tus apps → Android → Descargar `google-services.json`

7. **Reemplaza** `android/app/google-services.json` con el nuevo archivo

### OPCIÓN 2: Verificar que el webClientId pertenezca al mismo proyecto

Tu `webClientId` es: `762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa.apps.googleusercontent.com`

El Project Number del Firebase es: `194250427972`

**Si el `webClientId` pertenece a otro proyecto**, necesitas:

1. **Opción A**: Usar el `webClientId` del proyecto correcto (`194250427972`)
2. **Opción B**: Verificar que ambos proyectos estén vinculados en Google Cloud Console

### OPCIÓN 3: Crear cliente OAuth manualmente en Google Cloud Console

1. Ve a **Google Cloud Console**: https://console.cloud.google.com/
2. Selecciona el proyecto: **mi-turnow-cliente**
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **Create Credentials** → **OAuth client ID**
5. Tipo: **Android**
   - Package name: `com.miturnow.cliente`
   - SHA-1: `67:8B:05:62:4D:4E:B0:C5:B5:DF:3B:70:C6:5E:2D:D8:F1:49:9A:15`
6. Guarda y espera unos minutos
7. Descarga nuevamente `google-services.json` desde Firebase

### OPCIÓN 4: Forzar regeneración en Firebase (SOLUCIÓN RÁPIDA)

1. Ve a **Firebase Console**: https://console.firebase.google.com/project/mi-turnow-cliente
2. Ve a **Authentication** → **Sign-in method**
3. **Habilita Google** como proveedor (si no está habilitado)
4. Configura el cliente OAuth si es necesario
5. Guarda los cambios
6. Espera 5-10 minutos
7. Ve a **⚙️ Configuración del proyecto** → **Tus apps** → **Android**
8. Haz clic en **"Regenerar google-services.json"** o simplemente descárgalo nuevamente

## 🐛 VERIFICACIÓN

Después de seguir los pasos, verifica que el nuevo `google-services.json` tenga:

```json
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
```

## ⚠️ NOTA IMPORTANTE

Con `@capgo/capacitor-social-login`, el `oauth_client` vacío **NO debería** ser un problema si:
- El `webClientId` está configurado correctamente
- El `webClientId` pertenece al mismo proyecto de Firebase/Google Cloud

Si el login se "queda colgado" después de seleccionar la cuenta, el problema puede ser:
1. El `webClientId` es de otro proyecto
2. Falta configuración en Google Cloud Console
3. El `MainActivity` necesita modificarse (aunque la documentación dice que no es necesario sin scopes)

## 📋 PASOS INMEDIATOS

1. ✅ Verificar que las APIs estén habilitadas en Google Cloud Console
2. ✅ Verificar que Google Sign-In esté habilitado en Firebase Authentication
3. ✅ Descargar NUEVO `google-services.json` después de habilitar APIs
4. ✅ Verificar que el `webClientId` pertenezca al proyecto correcto

