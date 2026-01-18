# 🚀 CÓMO DESPLEGAR LA EDGE FUNCTION send-push-notification

## ✅ OPCIÓN 1: DESPLEGAR DESDE EL DASHBOARD (MÁS FÁCIL)

### Pasos:

1. **Ir a Supabase Dashboard**
   - Abre: https://supabase.com/dashboard
   - Selecciona tu proyecto: **Turnow Booking App** (rdznelijpliklisnflfm)

2. **Ir a Edge Functions**
   - En el menú lateral izquierdo, haz clic en **"Edge Functions"**
   - O ve directamente a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions

3. **Seleccionar la función send-push-notification**
   - Haz clic en **"send-push-notification"**

4. **Subir el archivo actualizado**
   - Haz clic en el tab **"Code"**
   - Haz clic en **"Edit"** o el botón de edición
   - Copia todo el contenido del archivo `supabase/functions/send-push-notification/index.ts`
   - Pega el código actualizado en el editor
   - Haz clic en **"Deploy"** o **"Save"**

5. **Verificar el despliegue**
   - Ve al tab **"Logs"**
   - Deberías ver logs sin errores de tabla inexistente

---

## ⚙️ OPCIÓN 2: INSTALAR SUPABASE CLI Y DESPLEGAR DESDE TERMINAL

### Paso 1: Instalar Supabase CLI

**Windows (PowerShell como Administrador):**
```powershell
# Opción A: Usando Scoop (recomendado si tienes Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Opción B: Usando npm (si tienes Node.js instalado)
npm install -g supabase

# Opción C: Descargar binario manualmente
# Ve a: https://github.com/supabase/cli/releases
# Descarga: supabase_X.X.X_windows_amd64.zip
# Extrae y agrega a PATH
```

**Verificar instalación:**
```powershell
supabase --version
```

### Paso 2: Autenticarse en Supabase

```powershell
supabase login
```

Esto abrirá tu navegador para autenticarte.

### Paso 3: Vincular al proyecto

```powershell
# Ir al directorio del proyecto
cd "C:\Users\laptop\Desktop\Bookwise cliente\remix-of-bookwise-client-96-80ebda79-main"

# Vincular al proyecto (si no está vinculado)
supabase link --project-ref rdznelijpliklisnflfm
```

### Paso 4: Desplegar la función

```powershell
supabase functions deploy send-push-notification
```

---

## ✅ OPCIÓN 3: USANDO GIT (SI ESTÁS USANDO DEPLOY AUTOMÁTICO)

Si tu proyecto está conectado a Git y tienes CI/CD configurado:

1. **Commit los cambios:**
   ```powershell
   git add supabase/functions/send-push-notification/index.ts
   git commit -m "Fix: Update send-push-notification to use client_devices table"
   git push
   ```

2. **El deploy se hará automáticamente** si tienes CI/CD configurado

---

## 🔍 VERIFICAR QUE EL DESPLIEGUE FUNCIONÓ

### 1. Revisar Logs en Supabase Dashboard

1. Ve a: **Edge Functions** → **send-push-notification** → **Logs**
2. Deberías ver:
   - ✅ `📬 Fetching FCM tokens from client_devices for user ...`
   - ✅ `✅ Found X device(s) for user ...`
   - ❌ Ya NO deberías ver: `relation "public.push_subscriptions" does not exist`

### 2. Probar enviando una notificación de prueba

Desde el código o desde Supabase Dashboard, invoca la función:

```typescript
// Ejemplo desde código
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: 'USER_ID_AQUI',
    title: 'Test',
    body: 'Testing push notification',
    data: {
      user_type: 'client'
    }
  }
});
```

---

## 📋 VERIFICAR SECRETOS REQUERIDOS

Antes de que funcione completamente, asegúrate de que el secret `FIREBASE_SERVICE_ACCOUNT` esté configurado:

1. **Supabase Dashboard** → **Edge Functions** → **send-push-notification**
2. Ve a la pestaña **"Secrets"**
3. Verifica que existe el secret `FIREBASE_SERVICE_ACCOUNT`
4. Si no existe, agrégalo:
   - Ve a Firebase Console → Project Settings → Service Accounts
   - Genera nueva clave privada (JSON)
   - Copia el contenido del JSON
   - En Supabase, agrega el secret `FIREBASE_SERVICE_ACCOUNT` con el contenido del JSON

---

## ✅ RESUMEN

**La forma más rápida es usar el Dashboard de Supabase:**
1. Ve a Edge Functions → send-push-notification
2. Edita el código
3. Pega el código actualizado
4. Deploy

**Tiempo estimado:** 2-3 minutos

---

## 🆘 PROBLEMAS COMUNES

### Error: "FIREBASE_SERVICE_ACCOUNT not configured"
**Solución:** Agregar el secret en Supabase Dashboard → Edge Functions → send-push-notification → Secrets

### Error: "Failed to get Firebase access token"
**Solución:** Verificar que el JSON del Service Account sea válido y tenga los permisos correctos

### Error: "No devices found"
**Solución:** Verificar que los tokens FCM se estén registrando correctamente en `client_devices`

---

**Recomendación:** Usa la Opción 1 (Dashboard) para desplegar rápidamente.

