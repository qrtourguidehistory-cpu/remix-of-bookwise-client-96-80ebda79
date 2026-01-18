# 🔍 AUDITORÍA: Login de Google se queda cargando

## 🐛 PROBLEMA IDENTIFICADO

**Síntoma:** Usuario hace clic en "Iniciar con Google" → Selecciona cuenta → App se queda cargando indefinidamente.

**Causa Raíz:** **INCONSISTENCIA EN ESQUEMAS DE DEEP LINKS**

---

## ❌ PROBLEMAS ENCONTRADOS

### 1. 🔴 Esquema de RedirectTo Incorrecto

**Ubicaciones:**
- `src/contexts/AuthContext.tsx:320` → `redirectTo = 'bookwise://login-callback'`
- `src/contexts/AuthContext.tsx:438-439` → `redirectTo = 'bookwise://login-callback'`
- `src/pages/auth/AuthPage.tsx:42` → `redirectTo = 'bookwise://login-callback'`
- `src/hooks/useNativeSocialLogin.ts:114` → `redirectTo = 'bookwise://login-callback'`

**Problema:**
- El código usa `bookwise://login-callback`
- Pero AndroidManifest solo captura `com.bookwise.client://*`
- **Android NO captura `bookwise://`, por eso el callback nunca llega**

### 2. 🔴 Deep Link Handler Busca Esquema Incorrecto

**Ubicación:** `src/hooks/useDeepLinks.ts`

**Problema:**
- Busca `bookwise://login-callback` (líneas 123, 136, 158, 181)
- Pero el esquema real es `com.bookwise.client://`
- **El handler nunca detecta el callback**

### 3. 🟡 AndroidManifest No Captura URLs de Supabase OAuth

**Problema:**
- Solo tiene intent-filter para `com.bookwise.client://*`
- **Falta** intent-filter para URLs HTTPS de Supabase que pueden venir directamente de Google
- Google puede redirigir directamente a `https://rdznelijpliklisnflfm.supabase.co/auth/v1/callback?...`

---

## ✅ SOLUCIÓN

### Cambio 1: Actualizar TODOS los redirectTo a `com.bookwise.client://login-callback`

### Cambio 2: Actualizar Deep Link Handler para buscar `com.bookwise.client://login-callback`

### Cambio 3: Agregar intent-filter para URLs de Supabase OAuth en AndroidManifest

---

**Estado:** ⚠️ **REQUIERE CORRECCIÓN URGENTE**

