# 🔍 AUDITORÍA COMPLETA: Edge Function send-push-notification

## 📋 RESUMEN EJECUTIVO

**Fecha de Auditoría:** 26 de Enero 2026  
**Función Auditada:** `send-push-notification`  
**Estado:** ⚠️ REQUIERE CONFIGURACIÓN DE SECRETS  
**Severidad:** 🔴 CRÍTICA (Sin secrets configurados, la función fallará)

---

## 1️⃣ MAPEO DE DEPENDENCIAS - Variables de Entorno

### Variables Requeridas (Deno.env.get())

| Variable | Línea | Tipo | Requerida | Estado Actual |
|----------|-------|------|-----------|---------------|
| `SUPABASE_URL` | 169 | String | ✅ CRÍTICA | ⚠️ Debe estar configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | 170 | String | ✅ CRÍTICA | ⚠️ Debe estar configurada |
| `FIREBASE_SERVICE_ACCOUNT` | 186 | JSON String | ✅ CRÍTICA | ❌ **FALTA CONFIGURAR** |

### Análisis Detallado:

#### ✅ SUPABASE_URL
- **Uso:** Crear cliente de Supabase con permisos de Service Role
- **Línea:** 169
- **Validación:** Usa operador `!` (non-null assertion) - Si falta, la función fallará
- **Valor Esperado:** `https://rdznelijpliklisnflfm.supabase.co`
- **Estado:** ⚠️ Debe configurarse como secret en Supabase Dashboard

#### ✅ SUPABASE_SERVICE_ROLE_KEY
- **Uso:** Autenticación con permisos de Service Role para consultar `client_devices`
- **Línea:** 170
- **Validación:** Usa operador `!` (non-null assertion) - Si falta, la función fallará
- **Valor Esperado:** Service Role Key del proyecto Supabase
- **Estado:** ⚠️ Debe configurarse como secret en Supabase Dashboard

#### ❌ FIREBASE_SERVICE_ACCOUNT
- **Uso:** JSON completo del Service Account de Firebase para autenticación OAuth y envío de FCM
- **Línea:** 186
- **Validación:** Verifica si existe, retorna error 500 si falta (línea 188-192)
- **Procesamiento:** Se parsea como JSON (línea 195): `JSON.parse(serviceAccountJson)`
- **Estructura Esperada:** Interface `ServiceAccount` (líneas 9-20)
- **Estado:** ❌ **NO CONFIGURADO - CRÍTICO**

---

## 2️⃣ VALIDACIÓN DE FIREBASE SERVICE ACCOUNT

### Estructura Requerida (Interface ServiceAccount):

```typescript
interface ServiceAccount {
  type: string;                    // "service_account"
  project_id: string;              // "bookwise-cliente" (verificado en google-services.json)
  private_key_id: string;          // ID de la clave privada
  private_key: string;             // Clave privada PEM completa
  client_email: string;            // Email del service account
  client_id: string;               // ID del cliente
  auth_uri: string;                // "https://accounts.google.com/o/oauth2/auth"
  token_uri: string;               // "https://oauth2.googleapis.com/token"
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}
```

### Validaciones Requeridas:

#### ✅ 1. Project ID Correcto
- **Valor Esperado:** `"bookwise-cliente"` (según `google-services.json` línea 4)
- **Verificación:** La función usa `serviceAccount.project_id` para construir la URL de FCM (línea 248)
- **URL FCM:** `https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`
- **Estado:** ✅ El código está correcto, pero el Service Account debe tener este `project_id`

#### ✅ 2. Package Name Coincide
- **Package Name Actual:** `com.bookwise.client` (según `google-services.json` línea 12)
- **Verificación:** El Service Account debe estar configurado en Firebase Console para este package
- **Requisito:** El Service Account debe tener permisos de FCM para el proyecto `bookwise-cliente`
- **Estado:** ⚠️ Debe verificarse en Firebase Console

#### ✅ 3. SHA-1 Certificado
- **Keystore de Producción:** `llave_cliente_miturnow.jks` (alias: `cliente_prod`)
- **Ubicación:** `C:\Users\laptop\Desktop\LLAVE CLIENTE TURNOW\llave_cliente_miturnow.jks`
- **Requisito:** El SHA-1 del keystore debe estar registrado en Firebase Console
- **Comando para obtener SHA-1:**
  ```powershell
  keytool -list -v -keystore "C:\Users\laptop\Desktop\LLAVE CLIENTE TURNOW\llave_cliente_miturnow.jks" -alias cliente_prod
  ```
- **Estado:** ⚠️ Debe verificarse en Firebase Console → Project Settings → Your apps → SHA certificate fingerprints

#### ✅ 4. Procesamiento JSON
- **Validación en Código:** Línea 195: `JSON.parse(serviceAccountJson)`
- **Riesgo:** Si el JSON está mal formado, la función fallará con error de parsing
- **Recomendación:** El secret debe contener el JSON completo como string (con todas las comillas escapadas o en formato JSON válido)

---

## 3️⃣ CONSISTENCIA DE BASE DE DATOS

### Tabla Utilizada: ✅ CORRECTA

**Líneas 199-208:**
```typescript
const user_type = data?.user_type || 'client';
const tableName = user_type === 'partner' ? 'partner_devices' : 'client_devices';

const { data: devices } = await supabase
  .from(tableName)  // ✅ Usa client_devices correctamente
  .select('id, fcm_token, platform')
  .eq('user_id', user_id);
```

### Validación:

- ✅ **Tabla Correcta:** Usa `client_devices` (no `push_subscriptions` que no existe)
- ✅ **Query Correcta:** Selecciona `id, fcm_token, platform` (campos existentes)
- ✅ **Filtro Correcto:** `eq('user_id', user_id)` (campo correcto)
- ✅ **Fallback Implementado:** Si `user_type` es `'partner'`, usa `partner_devices`

### Verificación de SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY:

- ✅ **SUPABASE_URL:** Se usa para crear cliente (línea 172)
- ✅ **SUPABASE_SERVICE_ROLE_KEY:** Permite consultar `client_devices` sin restricciones RLS
- ✅ **Permisos:** Service Role Key tiene permisos completos para INSERT/UPDATE/DELETE en `client_devices`

---

## 4️⃣ REPORTE DE VARIABLES FALTANTES/DESACTUALIZADAS

### ❌ CRÍTICO: Variables que Faltan

| Variable | Estado | Impacto | Prioridad |
|----------|--------|---------|-----------|
| `FIREBASE_SERVICE_ACCOUNT` | ❌ **NO CONFIGURADO** | La función retornará error 500 inmediatamente | 🔴 **CRÍTICA** |

### ⚠️ ALTO: Variables que Deben Verificarse

| Variable | Estado | Verificación Requerida | Prioridad |
|----------|--------|------------------------|-----------|
| `SUPABASE_URL` | ⚠️ Desconocido | Verificar que sea `https://rdznelijpliklisnflfm.supabase.co` | 🟡 ALTA |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Desconocido | Verificar que tenga permisos de Service Role | 🟡 ALTA |

### ✅ BAJO: Configuraciones Adicionales Recomendadas

1. **Firebase Console:**
   - ✅ Verificar que el Service Account tenga permisos de FCM
   - ✅ Verificar que el SHA-1 del keystore de producción esté registrado
   - ✅ Verificar que el package `com.bookwise.client` esté configurado

---

## 5️⃣ COMANDOS DE TERMINAL PARA CONFIGURAR SECRETS

### ⚠️ IMPORTANTE: Requisitos Previos

1. **Instalar Supabase CLI** (si no está instalado):
   ```powershell
   npm install -g supabase
   ```

2. **Autenticarse en Supabase:**
   ```powershell
   supabase login
   ```

3. **Vincular al proyecto** (si no está vinculado):
   ```powershell
   supabase link --project-ref rdznelijpliklisnflfm
   ```

---

### 📝 COMANDOS PARA CONFIGURAR SECRETS

#### 1. Configurar SUPABASE_URL

```powershell
supabase secrets set SUPABASE_URL="https://rdznelijpliklisnflfm.supabase.co" --project-ref rdznelijpliklisnflfm
```

**Nota:** Esta variable normalmente se inyecta automáticamente, pero se recomienda verificarla.

#### 2. Configurar SUPABASE_SERVICE_ROLE_KEY

```powershell
# Primero, obtener el Service Role Key desde Supabase Dashboard:
# Dashboard → Settings → API → service_role key (secret)
# Luego ejecutar:

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY_AQUI" --project-ref rdznelijpliklisnflfm
```

**⚠️ IMPORTANTE:** Reemplaza `TU_SERVICE_ROLE_KEY_AQUI` con el Service Role Key real de tu proyecto Supabase.

#### 3. Configurar FIREBASE_SERVICE_ACCOUNT (CRÍTICO)

**Paso 1: Obtener el Service Account JSON de Firebase**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona proyecto: **bookwise-cliente**
3. Ve a: **Project Settings** → **Service Accounts**
4. Haz clic en **"Generate new private key"**
5. Descarga el archivo JSON
6. Abre el JSON en un editor de texto

**Paso 2: Preparar el JSON para el comando**

El JSON debe estar como un string JSON válido (todas las comillas escapadas). Opción más fácil:

**Opción A: Usar PowerShell para leer el archivo y configurarlo**

```powershell
# Lee el archivo JSON del Service Account
$jsonContent = Get-Content "ruta\al\archivo\service-account.json" -Raw

# Configura el secret (PowerShell escapa las comillas automáticamente)
supabase secrets set FIREBASE_SERVICE_ACCOUNT='$jsonContent' --project-ref rdznelijpliklisnflfm
```

**Opción B: Configurar manualmente desde el Dashboard (RECOMENDADO)**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Proyecto: **Turnow Booking App** (rdznelijpliklisnflfm)
3. Ve a: **Edge Functions** → **send-push-notification**
4. Pestaña: **"Secrets"**
5. Haz clic en **"Add Secret"**
6. Nombre: `FIREBASE_SERVICE_ACCOUNT`
7. Valor: Pega el contenido completo del archivo JSON del Service Account
8. Haz clic en **"Save"**

---

## 6️⃣ SCRIPT COMPLETO DE CONFIGURACIÓN

### Script PowerShell para Configuración Automática

```powershell
# Script para configurar todos los secrets de send-push-notification
# Ejecutar en PowerShell como Administrador

Write-Host "🔧 Configurando secrets para send-push-notification..." -ForegroundColor Cyan

# Verificar que Supabase CLI esté instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI no está instalado. Instalando..." -ForegroundColor Red
    npm install -g supabase
}

# Autenticarse (si no está autenticado)
Write-Host "🔐 Autenticando en Supabase..." -ForegroundColor Yellow
supabase login

# Vincular proyecto
Write-Host "🔗 Vinculando proyecto..." -ForegroundColor Yellow
supabase link --project-ref rdznelijpliklisnflfm

# Configurar SUPABASE_URL
Write-Host "📝 Configurando SUPABASE_URL..." -ForegroundColor Yellow
supabase secrets set SUPABASE_URL="https://rdznelijpliklisnflfm.supabase.co" --project-ref rdznelijpliklisnflfm

# Configurar SUPABASE_SERVICE_ROLE_KEY (solicitar al usuario)
Write-Host "⚠️ Por favor, ingresa el SUPABASE_SERVICE_ROLE_KEY:" -ForegroundColor Yellow
$serviceRoleKey = Read-Host -AsSecureString
$serviceRoleKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceRoleKey)
)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$serviceRoleKeyPlain" --project-ref rdznelijpliklisnflfm

# Configurar FIREBASE_SERVICE_ACCOUNT
Write-Host "⚠️ Por favor, ingresa la ruta al archivo JSON del Firebase Service Account:" -ForegroundColor Yellow
$jsonPath = Read-Host
if (Test-Path $jsonPath) {
    $jsonContent = Get-Content $jsonPath -Raw
    # Escapar comillas dobles para PowerShell
    $jsonEscaped = $jsonContent.Replace('"', '\"')
    supabase secrets set FIREBASE_SERVICE_ACCOUNT="$jsonEscaped" --project-ref rdznelijpliklisnflfm
    Write-Host "✅ FIREBASE_SERVICE_ACCOUNT configurado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Archivo no encontrado: $jsonPath" -ForegroundColor Red
    Write-Host "💡 Puedes configurarlo manualmente desde el Dashboard:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/secrets" -ForegroundColor Cyan
}

Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host "📋 Verifica los secrets en el Dashboard:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/secrets" -ForegroundColor Cyan
```

---

## 7️⃣ VERIFICACIÓN POST-CONFIGURACIÓN

### Checklist de Verificación:

- [ ] `SUPABASE_URL` configurado y coincide con el proyecto
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado y tiene permisos de Service Role
- [ ] `FIREBASE_SERVICE_ACCOUNT` configurado como JSON válido
- [ ] `project_id` en Service Account es `"bookwise-cliente"`
- [ ] SHA-1 del keystore de producción está registrado en Firebase Console
- [ ] Package `com.bookwise.client` está configurado en Firebase Console
- [ ] La función consulta correctamente `client_devices` (✅ ya verificado en código)

### Comandos de Verificación:

```powershell
# Listar todos los secrets (requiere Supabase CLI)
supabase secrets list --project-ref rdznelijpliklisnflfm

# Verificar logs de la función
# Dashboard → Edge Functions → send-push-notification → Logs
```

---

## 8️⃣ ESTRUCTURA ESPERADA DEL FIREBASE SERVICE ACCOUNT JSON

### Ejemplo de JSON Válido:

```json
{
  "type": "service_account",
  "project_id": "bookwise-cliente",
  "private_key_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@bookwise-cliente.iam.gserviceaccount.com",
  "client_id": "xxxxxxxxxxxxxxxxxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40bookwise-cliente.iam.gserviceaccount.com"
}
```

### Validaciones del JSON:

1. ✅ **project_id:** Debe ser `"bookwise-cliente"` (coincide con `google-services.json`)
2. ✅ **private_key:** Debe contener la clave PEM completa con `\n` para saltos de línea
3. ✅ **client_email:** Debe terminar en `@bookwise-cliente.iam.gserviceaccount.com`
4. ✅ **Formato:** JSON válido con todas las comillas escapadas si se pasa como string

---

## 9️⃣ COMANDOS FINALES - TODOS EN UNO

### Comando Completo (Reemplazar valores):

```powershell
# 1. Configurar SUPABASE_URL (generalmente ya está configurado)
supabase secrets set SUPABASE_URL="https://rdznelijpliklisnflfm.supabase.co" --project-ref rdznelijpliklisnflfm

# 2. Configurar SUPABASE_SERVICE_ROLE_KEY (obtener desde Dashboard → Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." --project-ref rdznelijpliklisnflfm

# 3. Configurar FIREBASE_SERVICE_ACCOUNT (usar Dashboard si el JSON es muy largo)
# Desde archivo:
$json = Get-Content "C:\ruta\a\service-account.json" -Raw
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$json" --project-ref rdznelijpliklisnflfm
```

---

## 🔟 RESUMEN FINAL

### ✅ Estado del Código:
- ✅ Tabla `client_devices` se usa correctamente
- ✅ Query es correcta (id, fcm_token, platform)
- ✅ Fallback a `partner_devices` implementado
- ✅ Manejo de errores implementado
- ✅ Validación de variables implementada

### ❌ Estado de Configuración:
- ❌ `FIREBASE_SERVICE_ACCOUNT` **NO CONFIGURADO** (CRÍTICO)
- ⚠️ `SUPABASE_URL` debe verificarse
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` debe verificarse

### 🎯 Acciones Requeridas:
1. 🔴 **CRÍTICO:** Configurar `FIREBASE_SERVICE_ACCOUNT` desde Firebase Console
2. 🟡 **ALTO:** Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
3. 🟢 **MEDIO:** Verificar SHA-1 del keystore en Firebase Console
4. 🟢 **MEDIO:** Verificar package `com.bookwise.client` en Firebase Console

---

**Estado General:** ⚠️ **REQUIERE CONFIGURACIÓN INMEDIATA**  
**Prioridad:** 🔴 **CRÍTICA** - Sin `FIREBASE_SERVICE_ACCOUNT`, la función no funcionará

---

**Generado:** 26 de Enero 2026  
**Función:** send-push-notification  
**Proyecto:** rdznelijpliklisnflfm (Turnow Booking App)

