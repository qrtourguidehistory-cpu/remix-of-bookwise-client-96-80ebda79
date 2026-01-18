# ✅ RESUMEN EJECUTIVO: Auditoría de Secrets - send-push-notification

## 🔍 VARIABLES REQUERIDAS (3)

| Variable | Estado | Prioridad | Acción Requerida |
|----------|--------|-----------|------------------|
| `SUPABASE_URL` | ⚠️ Verificar | 🟡 ALTA | Configurar o verificar |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Verificar | 🟡 ALTA | Configurar o verificar |
| `FIREBASE_SERVICE_ACCOUNT` | ❌ **FALTA** | 🔴 **CRÍTICA** | **CONFIGURAR INMEDIATAMENTE** |

---

## 📋 COMANDOS PARA CONFIGURAR TODOS LOS SECRETS

### ⚡ OPCIÓN 1: Ejecutar Script Automático (RECOMENDADO)

```powershell
# Ejecutar el script completo
.\COMANDOS_CONFIGURAR_SECRETS.ps1
```

---

### ⚡ OPCIÓN 2: Comandos Individuales

#### 1. Configurar SUPABASE_URL

```powershell
supabase secrets set SUPABASE_URL="https://rdznelijpliklisnflfm.supabase.co" --project-ref rdznelijpliklisnflfm
```

#### 2. Configurar SUPABASE_SERVICE_ROLE_KEY

**Primero, obtén el Service Role Key:**
- Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api
- Copia el **service_role key** (secret)

**Luego ejecuta:**
```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY_AQUI" --project-ref rdznelijpliklisnflfm
```

#### 3. Configurar FIREBASE_SERVICE_ACCOUNT (CRÍTICO)

**Paso 1: Obtener el Service Account JSON**
- Ve a: https://console.firebase.google.com/
- Proyecto: **bookwise-cliente**
- **Project Settings** → **Service Accounts**
- **Generate new private key** → Descarga el JSON

**Paso 2: Configurar el Secret**

**Opción A: Desde archivo (PowerShell)**
```powershell
$json = Get-Content "C:\ruta\a\tu-service-account.json" -Raw
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$json" --project-ref rdznelijpliklisnflfm
```

**Opción B: Desde Dashboard (MÁS FÁCIL)**
1. Ve a: https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/secrets
2. **Add Secret**
3. Nombre: `FIREBASE_SERVICE_ACCOUNT`
4. Valor: Pega el contenido completo del JSON del Service Account
5. **Save**

---

## ✅ VALIDACIONES REALIZADAS

### ✅ Código de la Función:
- ✅ Usa tabla `client_devices` correctamente (no `push_subscriptions`)
- ✅ Query correcta: `id, fcm_token, platform`
- ✅ Filtro correcto: `eq('user_id', user_id)`
- ✅ Manejo de errores implementado

### ✅ Firebase:
- ✅ `google-services.json` tiene package `com.bookwise.client`
- ✅ Project ID: `bookwise-cliente`
- ⚠️ **VERIFICAR:** SHA-1 del keystore registrado en Firebase Console
- ⚠️ **VERIFICAR:** Service Account debe tener permisos de FCM

### ✅ Base de Datos:
- ✅ Tabla `client_devices` existe (verificado en migraciones)
- ✅ RLS configurado correctamente
- ✅ Service Role Key tiene permisos completos

---

## 🎯 CHECKLIST DE CONFIGURACIÓN

- [ ] Supabase CLI instalado: `supabase --version`
- [ ] Autenticado en Supabase: `supabase login`
- [ ] Proyecto vinculado: `supabase link --project-ref rdznelijpliklisnflfm`
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `FIREBASE_SERVICE_ACCOUNT` configurado (CRÍTICO)
- [ ] SHA-1 del keystore registrado en Firebase Console
- [ ] Package `com.bookwise.client` configurado en Firebase Console

---

## 📊 VERIFICAR CONFIGURACIÓN

```powershell
# Listar todos los secrets configurados
supabase secrets list --project-ref rdznelijpliklisnflfm
```

**Resultado esperado:**
```
Name                        Value
----                        -----
SUPABASE_URL                https://rdznelijpliklisnflfm.supabase.co
SUPABASE_SERVICE_ROLE_KEY   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FIREBASE_SERVICE_ACCOUNT    {"type":"service_account","project_id":"bookwise-cliente",...}
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Error: "FIREBASE_SERVICE_ACCOUNT not configured"
**Solución:** Configurar el secret `FIREBASE_SERVICE_ACCOUNT` con el JSON del Service Account

### Error: "Failed to get Firebase access token"
**Solución:** 
1. Verificar que el JSON del Service Account sea válido
2. Verificar que `project_id` sea `"bookwise-cliente"`
3. Verificar que el Service Account tenga permisos de FCM

### Error: "relation 'public.client_devices' does not exist"
**Solución:** Ejecutar la migración que crea la tabla `client_devices`:
```sql
-- Ya existe en: supabase/migrations/20251228000001_create_client_devices_table.sql
```

### Error: "No devices found"
**Solución:** Verificar que los tokens FCM se estén registrando correctamente en `client_devices` cuando el usuario inicia sesión

---

## 📞 ENLACES ÚTILES

- **Supabase Dashboard Secrets:** https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/secrets
- **Firebase Console:** https://console.firebase.google.com/project/bookwise-cliente
- **Supabase API Settings:** https://supabase.com/dashboard/project/rdznelijpliklisnflfm/settings/api
- **Logs de la Función:** https://supabase.com/dashboard/project/rdznelijpliklisnflfm/functions/send-push-notification/logs

---

**Estado:** ⚠️ **REQUIERE CONFIGURACIÓN INMEDIATA**  
**Prioridad Máxima:** Configurar `FIREBASE_SERVICE_ACCOUNT`

