# 🔍 AUDITORÍA COMPLETA - REGISTRO FCM TOKEN APP CLIENTE

**Fecha:** 2025-02-02  
**Objetivo:** Identificar problemas en el flujo de registro de tokens FCM  
**Problema reportado:** Tokens no se registran, permisos no se solicitan al reinstalar, Edge Functions fallan con "messaging/registration-token-not-registered"

---

## ✅ LO QUE EXISTE Y FUNCIONA CORRECTAMENTE

### 1️⃣ Servicio de Push Notifications

**Archivo:** `src/hooks/useFCMNotifications.ts`  
**Líneas:** 23-479  
**Estado:** ✅ Existe y está bien implementado

**Funcionalidades:**
- ✅ Función `initializeFCM()` que inicializa FCM (línea 140)
- ✅ Solicita permisos con `PushNotifications.requestPermissions()` (línea 196)
- ✅ Llama a `PushNotifications.register()` (línea 265)
- ✅ Listener `'registration'` que guarda el token (línea 218)
- ✅ Listener `'registrationError'` para errores (línea 239)
- ✅ Verifica `Capacitor.isNativePlatform()` antes de inicializar (línea 147)
- ✅ Valida sesión antes de registrar token (líneas 45-67)
- ✅ Valida que `userId` coincida con sesión (línea 58)
- ✅ Guarda token en `client_devices` con `role: 'client'` (línea 81)

**Código relevante:**
```typescript
// Línea 196: Solicita permisos
permStatus = await PushNotifications.requestPermissions();

// Línea 218: Listener de registro
await PushNotifications.addListener('registration', async (token) => {
  await registerToken(tokenValue, userId);
});

// Línea 265: Registra para obtener token
await PushNotifications.register();
```

---

### 2️⃣ Componente FCMInitializer

**Archivo:** `src/components/notifications/FCMInitializer.tsx`  
**Líneas:** 1-44  
**Estado:** ✅ Existe pero ⚠️ **NO SE ESTÁ USANDO**

**Funcionalidades:**
- ✅ Usa `useFCMNotifications` hook
- ✅ Se inicializa cuando hay `user` y `session`
- ✅ Logs de observabilidad

**Problema:** El componente existe pero **NO está siendo usado en `App.tsx`**

---

### 3️⃣ AuthContext

**Archivo:** `src/contexts/AuthContext.tsx`  
**Líneas:** 56-100, 268-295  
**Estado:** ✅ Maneja autenticación correctamente

**Funcionalidades:**
- ✅ Listener `onAuthStateChange` detecta `SIGNED_IN` (línea 71)
- ✅ Desactiva tokens en `signOut` (líneas 270-290)
- ✅ Comentario indica que push notifications se manejan por `FCMInitializer` (línea 77)

**Código relevante:**
```typescript
// Línea 71: Detecta SIGNED_IN
if (event === 'SIGNED_IN' && session?.user) {
  // Push notifications manejado por FCMInitializer con useFCMNotifications
}

// Línea 275: Desactiva tokens en logout
await supabase
  .from('client_devices')
  .update({ is_active: false })
  .eq('user_id', user.id);
```

---

### 4️⃣ Guardado en Supabase

**Archivo:** `src/hooks/useFCMNotifications.ts`  
**Líneas:** 74-95  
**Estado:** ✅ Guarda correctamente con validaciones

**Código:**
```typescript
const { data, error } = await supabase
  .from('client_devices')
  .upsert(
    {
      user_id: currentUserId,
      fcm_token: token,
      platform: platform === 'android' ? 'android' : platform,
      role: 'client', // ✅ CRÍTICO: Siempre 'client'
      is_active: true,
      device_info: { ... },
      updated_at: new Date().toISOString()
    },
    {
      onConflict: 'client_devices_user_token_unique',
      ignoreDuplicates: false
    }
  )
```

**Validaciones implementadas:**
- ✅ Verifica sesión válida (línea 45)
- ✅ Verifica que `userId` coincida con sesión (línea 58)
- ✅ Verifica que `userId` no sea null/undefined (línea 64)
- ✅ Usa `role: 'client'` (línea 81)
- ✅ Usa `is_active: true` (línea 82)

---

### 5️⃣ Configuración de Capacitor

**Archivo:** `capacitor.config.ts`  
**Líneas:** 1-12  
**Estado:** ✅ Configurado correctamente

**Configuración:**
```typescript
appId: 'com.miturnow.cliente', // ✅ Correcto para app cliente
appName: 'Mí Turnow',
webDir: 'dist',
android: {
  appId: 'com.miturnow.cliente',
}
```

**Dependencias:**
- ✅ `@capacitor/push-notifications: ^7.0.4` (package.json línea 21)

---

### 6️⃣ Listeners

**Archivo:** `src/hooks/useFCMNotifications.ts`  
**Líneas:** 218-256  
**Estado:** ✅ Todos los listeners están registrados

**Listeners implementados:**
- ✅ `'registration'` - Recibe token FCM (línea 218)
- ✅ `'registrationError'` - Maneja errores de registro (línea 239)
- ✅ `'pushNotificationReceived'` - Notificaciones en foreground (línea 247)
- ✅ `'pushNotificationActionPerformed'` - Tap en notificación (línea 253)

---

### 7️⃣ Logs de Observabilidad

**Archivo:** `src/hooks/useFCMNotifications.ts`  
**Estado:** ✅ Logs extensivos implementados

**Logs encontrados:**
- `🚀 [FCM] ===== INICIO DE initializeFCM =====`
- `📱 [FCM] Token generado:`
- `✅ [FCM] Token registrado/actualizado exitosamente`
- `❌ [FCM] Error al registrar token`
- `🎉 [FCM] ===== TOKEN FCM GENERADO =====`

---

## ❌ LO QUE FALTA

### 1️⃣ FCMInitializer NO está siendo usado

**Archivo:** `src/App.tsx`  
**Problema:** El componente `FCMInitializer` existe pero **NO está importado ni usado** en `App.tsx`

**Solución sugerida:**
```typescript
// En src/App.tsx, después de la línea 90 (<AuthProvider>)
import { FCMInitializer } from '@/components/notifications/FCMInitializer';

// Dentro de AuthProvider, envolver children:
<AuthProvider>
  <FCMInitializer>
    <AuthRedirectHandler />
    <NotificationsProvider>
      {/* ... resto del código ... */}
    </NotificationsProvider>
  </FCMInitializer>
</AuthProvider>
```

**Impacto:** Sin esto, el hook `useFCMNotifications` **NO se inicializa automáticamente** cuando el usuario inicia sesión o la app se abre con sesión existente.

---

### 2️⃣ Inicialización depende de useEffect con userId

**Archivo:** `src/hooks/useFCMNotifications.ts`  
**Líneas:** 358-411  
**Problema:** La inicialización depende de que `userId` esté disponible, pero si `FCMInitializer` no se usa, el hook nunca se ejecuta.

**Solución sugerida:** Ya está implementada en el hook (líneas 428-468), pero necesita que `FCMInitializer` esté montado para funcionar.

---

## ⚠️ LO QUE ESTÁ MAL

### 1️⃣ Constraint de onConflict NO existe en la base de datos

**Archivo:** `src/hooks/useFCMNotifications.ts`  
**Línea:** 91  
**Problema:** El código usa `onConflict: 'client_devices_user_token_unique'` pero esta constraint **NO existe** en la base de datos actual.

**Estado actual de la base de datos:**
- ✅ Existe: `client_devices_fcm_token_unique` (UNIQUE en `fcm_token`)
- ❌ NO existe: `client_devices_user_token_unique` (UNIQUE en `user_id, fcm_token`)

**Código actual:**
```typescript
{
  onConflict: 'client_devices_user_token_unique', // ❌ Esta constraint NO existe
  ignoreDuplicates: false
}
```

**Código correcto:**
```typescript
{
  onConflict: 'fcm_token', // ✅ Usar la constraint que SÍ existe
  ignoreDuplicates: false
}
```

**O mejor aún, crear la constraint faltante:**
```sql
ALTER TABLE public.client_devices
ADD CONSTRAINT client_devices_user_token_unique 
UNIQUE (user_id, fcm_token);
```

**Impacto:** El `upsert` puede fallar o no funcionar como se espera, causando que los tokens no se registren correctamente.

---

### 2️⃣ FCMInitializer no se monta automáticamente

**Archivo:** `src/App.tsx`  
**Problema:** Aunque el hook `useFCMNotifications` tiene lógica para inicializarse cuando hay `userId`, si `FCMInitializer` no está montado, el hook nunca se ejecuta.

**Impacto:** 
- Los tokens NO se registran al iniciar sesión
- Los tokens NO se registran al abrir la app con sesión existente
- Los permisos NO se solicitan automáticamente

---

### 3️⃣ Posible problema con reinicialización

**Archivo:** `src/hooks/useFCMNotifications.ts`  
**Líneas:** 168-179  
**Problema:** El código previene múltiples inicializaciones con flags, pero si el usuario reinstala la app, estos flags pueden no resetearse correctamente.

**Código actual:**
```typescript
if (initializationAttempted.current === userId && registrationCalled.current) {
  console.log('ℹ️ [FCM] Ya se intentó inicialización para este usuario');
  return; // ❌ Puede prevenir reinicialización después de reinstalar
}
```

**Solución sugerida:** Verificar si el token ya está registrado en Supabase antes de prevenir la inicialización.

---

## 📊 RESUMEN DE PROBLEMAS CRÍTICOS

### 🔴 CRÍTICO - Debe arreglarse inmediatamente:

1. **FCMInitializer no está siendo usado en App.tsx**
   - **Impacto:** Los tokens nunca se registran automáticamente
   - **Solución:** Agregar `<FCMInitializer>` en `App.tsx`

2. **Constraint `client_devices_user_token_unique` no existe**
   - **Impacto:** El `upsert` puede fallar o no funcionar correctamente
   - **Solución:** Cambiar `onConflict` a `'fcm_token'` o crear la constraint faltante

### 🟡 IMPORTANTE - Debe revisarse:

3. **Reinicialización después de reinstalar app**
   - **Impacto:** Los tokens pueden no registrarse después de reinstalar
   - **Solución:** Mejorar lógica de flags o verificar token en Supabase

---

## 🎯 RECOMENDACIONES

### 1. Agregar FCMInitializer a App.tsx

```typescript
// src/App.tsx
import { FCMInitializer } from '@/components/notifications/FCMInitializer';

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NativeNavigationHandler>
              <AuthProvider>
                <FCMInitializer> {/* ✅ AGREGAR AQUÍ */}
                  <AuthRedirectHandler />
                  <NotificationsProvider>
                    {/* ... resto ... */}
                  </NotificationsProvider>
                </FCMInitializer> {/* ✅ CERRAR AQUÍ */}
              </AuthProvider>
            </NativeNavigationHandler>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeInitializer>
    </QueryClientProvider>
  </ErrorBoundary>
);
```

### 2. Corregir onConflict en useFCMNotifications.ts

```typescript
// src/hooks/useFCMNotifications.ts, línea 91
{
  onConflict: 'fcm_token', // ✅ Cambiar a la constraint que existe
  ignoreDuplicates: false
}
```

**O crear la constraint faltante:**
```sql
-- Nueva migración
ALTER TABLE public.client_devices
ADD CONSTRAINT client_devices_user_token_unique 
UNIQUE (user_id, fcm_token);
```

### 3. Verificar que los permisos se soliciten al reinstalar

El código ya solicita permisos (línea 196), pero asegurarse de que se ejecute después de reinstalar. Considerar agregar verificación de permisos en `App.tsx` o en un componente de inicialización.

---

## ✅ VERIFICACIÓN POST-FIX

Después de aplicar las correcciones, verificar:

1. ✅ `FCMInitializer` está montado en `App.tsx`
2. ✅ Los logs muestran `🚀 [FCM] ===== INICIO DE initializeFCM =====` al iniciar sesión
3. ✅ Los logs muestran `🎉 [FCM] ===== TOKEN FCM GENERADO =====` cuando se obtiene el token
4. ✅ Los logs muestran `✅ [FCM] Token registrado/actualizado exitosamente` cuando se guarda en Supabase
5. ✅ La tabla `client_devices` tiene registros con `role = 'client'` y `is_active = true`
6. ✅ El `upsert` funciona correctamente (no hay errores de constraint)

---

## 📝 CONCLUSIÓN

El código de registro de tokens FCM está **bien implementado** pero tiene **2 problemas críticos**:

1. **FCMInitializer no se está usando** → Los tokens nunca se registran automáticamente
2. **Constraint incorrecta en onConflict** → El upsert puede fallar

**Con estas 2 correcciones, el sistema debería funcionar correctamente.**

