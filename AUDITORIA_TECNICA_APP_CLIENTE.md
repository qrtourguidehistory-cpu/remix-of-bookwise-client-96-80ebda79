# 🔍 AUDITORÍA TÉCNICA - APP CLIENTE
## Pre-lanzamiento Google Play Store

**Fecha:** Enero 2026  
**Aplicación:** Mí Turnow (App Cliente)  
**Versión analizada:** 1.0 (versionCode: 1)

---

## 📋 RESUMEN EJECUTIVO

| Categoría | Estado | Hallazgos Críticos | Hallazgos Menores |
|-----------|--------|-------------------|-------------------|
| **Seguridad** | 🔴 CRÍTICO | 3 | 0 |
| **Configuración Android** | 🟡 REVISAR | 2 | 1 |
| **Geolocalización** | 🟡 REVISAR | 1 | 1 |
| **Privacidad** | ✅ ACEPTABLE | 0 | 1 |
| **Flujo de Reserva** | ✅ ACEPTABLE | 0 | 0 |
| **Recibos PDF** | ⚠️ NO ENCONTRADO | 1 | 0 |

**⚠️ ACCIÓN REQUERIDA:** Se encontraron **3 hallazgos CRÍTICOS** de seguridad que DEBEN corregirse antes del lanzamiento.

---

## 🔴 CRÍTICO - PRIORIDAD 1: SEGURIDAD

### 🔴 CR-1: Token de Mapbox Hardcodeado

**Ubicación:** `src/components/MiTurnowMap.tsx:14`

**Código actual:**
```typescript
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "pk.eyJ1IjoibWl0b3Vybm93IiwiYSI6ImNta2hzYnN3aTBtaHIzZHB1MHgydTZ1OWMifQ.I90chYaZczEFiJ33M7hdxw";
```

**Problema:**
- ✅ Token de Mapbox expuesto como fallback hardcodeado
- ❌ Puede ser extraído del bundle de la app
- ⚠️ Riesgo de uso no autorizado y costos inesperados

**Recomendación:**
- ❌ **ELIMINAR** el token hardcodeado del código
- ✅ Usar **SOLO** variable de entorno `VITE_MAPBOX_ACCESS_TOKEN`
- ✅ Si falta el token, mostrar error claro y no inicializar el mapa
- ✅ Validar que la variable exista en el build de producción

**Impacto:** ALTO - Exposición de credenciales en código fuente

---

### 🔴 CR-2: Credenciales de Supabase Hardcodeadas (2 ubicaciones)

**Ubicación 1:** `src/integrations/supabase/client.ts:6-7`
```typescript
const SUPABASE_URL = "https://rdznelijpliklisnflfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Ubicación 2:** `src/hooks/useFCMNotifications.ts:285-286`
```typescript
const supabaseUrl = 'https://rdznelijpliklisnflfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Problema:**
- ✅ URLs y keys de Supabase hardcodeadas en el código
- ⚠️ Comentario dice "Use direct values for Capacitor compatibility" pero esto es INSEGURO
- ❌ Estas credenciales quedan expuestas en el bundle
- ⚠️ Aunque son "publishable", NO deben estar hardcodeadas

**Recomendación:**
- ✅ **CRÍTICO:** Mover a variables de entorno o configuración de build
- ✅ Usar Capacitor Preferences o variables de build-time
- ✅ Para Capacitor: Inyectar variables en `capacitor.config.ts` durante el build
- ✅ Crear archivo `.env.production` que NO se suba a Git
- ✅ Verificar que `.env*` esté en `.gitignore`

**Impacto:** ALTO - Exposición de credenciales, aunque sean públicas

**Nota:** Las keys son "publishable" (anon key), pero Google Play requiere que todas las credenciales se manejen de forma segura.

---

### 🔴 CR-3: Debug Keystore en Producción

**Ubicación:** `android/app/build.gradle:34-41`

**Código actual:**
```gradle
if (keystorePropertiesFile.exists()) {
    // ... usar keystore.properties
} else {
    // Usar debug keystore para testing
    def debugKeystore = file("${System.getProperty('user.home')}/.android/debug.keystore")
    if (debugKeystore.exists()) {
        storeFile debugKeystore
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
}
```

**Problema:**
- ❌ Fallback a debug keystore si no encuentra `keystore.properties`
- ⚠️ Puede compilar en producción con keystore de debug
- ❌ Google Play rechazará builds con debug keystore
- ❌ No es posible actualizar la app si se usa debug keystore

**Recomendación:**
- ✅ **ELIMINAR** el fallback a debug keystore
- ✅ Hacer **obligatorio** el archivo `keystore.properties` para builds release
- ✅ Agregar validación que **falle el build** si falta el keystore
- ✅ Documentar proceso de creación de keystore para producción
- ✅ Asegurar que `keystore.properties` esté en `.gitignore`

**Impacto:** CRÍTICO - Imposibilidad de publicar en Google Play

---

## 🟡 REVISAR - PRIORIDAD 2: CONFIGURACIÓN ANDROID

### 🟡 AV-1: ApplicationId - Revisar Profesionalismo

**Ubicación:** `android/app/build.gradle:7` y `capacitor.config.ts:4`

**Código actual:**
```gradle
applicationId "com.bookwise.client"
```
```typescript
appId: 'com.bookwise.client',
```

**Análisis:**
- ✅ Diferente a Partner (`com.bookwise.client` vs Partner que usa otro ID)
- ✅ Formato profesional (dominio inverso)
- ⚠️ Nombre de dominio: "bookwise" (verificar si es el dominio oficial)

**Recomendación:**
- ⚠️ Verificar que `com.bookwise.client` sea el ID deseado
- ⚠️ Considerar `com.mitournow.client` si "Mi Turnow" es la marca oficial
- ✅ Una vez definido, NO cambiarlo (requiere nueva app en Play Store)

**Impacto:** MEDIO - Cambiar ID requiere nueva app en Play Store

---

### 🟡 AV-2: Target SDK Version

**Ubicación:** `android/variables.gradle:4`

**Código actual:**
```gradle
targetSdkVersion = 35
compileSdkVersion = 35
```

**Análisis:**
- ✅ Target SDK 35 (API 35) - SUPERIOR a API 34 requerido para 2026
- ✅ Compile SDK 35 - Actualizado
- ✅ Min SDK 23 (Android 6.0) - Compatible con ~98% de dispositivos

**Estado:** ✅ **CUMPLE** con requisitos de Google Play 2026

**Recomendación:**
- ✅ Mantener targetSdkVersion 35
- ✅ Monitorear actualizaciones de API 36 para futuras versiones

**Impacto:** BAJO - Ya cumple requisitos

---

### 🟢 AV-3: Iconos Adaptativos

**Ubicación:** `android/app/src/main/res/mipmap-anydpi-v26/`

**Análisis:**
- ✅ Existen archivos `ic_launcher.xml` y `ic_launcher_round.xml`
- ✅ Estructura de carpetas mipmap-* correcta (hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi)
- ✅ Soporte para iconos adaptativos (Android 8.0+)

**Verificación necesaria:**
- ⚠️ **MANUAL:** Verificar que los archivos XML contengan definiciones de iconos adaptativos
- ⚠️ **MANUAL:** Verificar que los iconos PNG en mipmap-* tengan tamaños correctos
- ⚠️ **MANUAL:** Probar en dispositivo real que los iconos se vean correctos

**Recomendación:**
- ✅ Revisar manualmente `ic_launcher.xml` para asegurar formato adaptativo
- ✅ Verificar tamaños: mdpi (48dp), hdpi (72dp), xhdpi (96dp), xxhdpi (144dp), xxxhdpi (192dp)
- ✅ Probar en Android 8.0+ para verificar iconos adaptativos

**Impacto:** MEDIO - Puede afectar la experiencia visual

---

## 🟡 REVISAR - PRIORIDAD 3: GEOLOCALIZACIÓN

### 🟡 GL-1: Permisos de Ubicación - Falta en AndroidManifest

**Ubicación:** `android/app/src/main/AndroidManifest.xml`

**Análisis:**
- ❌ **NO existe** `<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />`
- ❌ **NO existe** `<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />`
- ✅ El mapa usa `GeolocateControl` de Mapbox que requiere permisos
- ⚠️ La app puede fallar al solicitar ubicación en Android

**Código relacionado:** `src/components/MiTurnowMap.tsx:78-94`
```typescript
const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  // ...
});
geolocateControl.trigger(); // Se activa automáticamente al cargar
```

**Problema:**
- ⚠️ Mapbox solicita geolocalización automáticamente al cargar (`trigger()`)
- ❌ Sin permisos en manifest, la app puede crashear o no funcionar
- ⚠️ Google Play puede rechazar si la app solicita permisos sin declararlos

**Recomendación:**
- ✅ **AGREGAR** permisos de ubicación en AndroidManifest.xml:
  ```xml
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  ```
- ✅ **AGREGAR** declaración de uso de permisos (Android 11+):
  ```xml
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" 
                   android:maxSdkVersion="30" />
  ```
- ✅ **MODIFICAR** MiTurnowMap para solicitar permisos solo cuando el usuario interactúa con el botón de geolocalización (no automáticamente)
- ✅ Agregar `usesPermissionRationale` para explicar por qué se necesita ubicación

**Impacto:** ALTO - La app puede fallar en Android sin estos permisos

---

### 🟡 GL-2: Activación Automática de Geolocalización

**Ubicación:** `src/components/MiTurnowMap.tsx:93-95`

**Código actual:**
```typescript
map.current.on("load", () => {
  geolocateControl.trigger(); // Se activa automáticamente
});
```

**Problema:**
- ⚠️ Google Play prefiere que los permisos se soliciten **solo cuando es necesario**
- ⚠️ Solicitar ubicación inmediatamente al abrir el mapa viola best practices
- ⚠️ Puede causar rechazo en revisión de Google Play

**Recomendación:**
- ✅ **ELIMINAR** `geolocateControl.trigger()` automático
- ✅ Mostrar el botón de geolocalización pero **NO activarlo automáticamente**
- ✅ El usuario debe hacer clic explícitamente en el botón para activar GPS
- ✅ Esto cumple con las políticas de Google Play sobre permisos

**Impacto:** MEDIO - Puede causar rechazo en revisión de Google Play

---

### ✅ GL-3: Navegación GPS desde BusinessProfile

**Ubicación:** `src/pages/BusinessProfile.tsx:202-227`

**Análisis:**
- ✅ Usa coordenadas GPS cuando están disponibles (prioridad)
- ✅ Fallback a dirección de texto si no hay coordenadas
- ✅ Usa Capacitor Browser para apertura nativa
- ✅ Logs claros para debugging

**Estado:** ✅ **FUNCIONAL** y bien implementado

**Recomendación:**
- ✅ Mantener implementación actual
- ⚠️ Verificar que las coordenadas se estén guardando correctamente en Supabase

**Impacto:** BAJO - Ya está funcionando correctamente

---

## ✅ ACEPTABLE - PRIORIDAD 4: PRIVACIDAD

### ✅ PR-1: Términos y Condiciones / Política de Privacidad

**Ubicación:**
- Páginas: `src/pages/TermsOfServicePage.tsx`, `src/pages/PrivacyPolicyPage.tsx`
- Rutas: `/terms`, `/privacy-policy`

**Análisis:**
- ✅ Existen páginas dedicadas con contenido completo
- ✅ Accesibles desde HelpSupportPage (`/help`)
- ✅ Accesibles desde SettingsPage (sección "Data & Privacy")
- ✅ Presentes en WelcomeScreen (checkbox de aceptación)
- ✅ Presentes en RegisterPage (checkbox de aceptación)
- ✅ Última actualización: Enero 2026

**Estado:** ✅ **CUMPLE** con requisitos de Google Play

**Recomendación:**
- ✅ Verificar manualmente que el contenido esté completo y actualizado
- ✅ Asegurar que los enlaces funcionen correctamente en producción
- ✅ Considerar agregar enlace en footer de la app si existe

**Impacto:** BAJO - Ya está implementado correctamente

---

## ✅ ACEPTABLE - PRIORIDAD 5: FLUJO DE RESERVA

### ✅ FR-1: Validaciones de Reserva

**Ubicación:** `src/pages/BookingPage.tsx` y `supabase/migrations/20251218000000_prevent_appointment_overlap.sql`

**Análisis:**

**Validaciones implementadas:**
1. ✅ Validación de disponibilidad antes de crear cita (líneas 694-748)
2. ✅ Constraint de base de datos para prevenir overlaps (migration SQL)
3. ✅ Verificación de conflictos con citas existentes (pending, confirmed, arrived, started)
4. ✅ Manejo de errores con mensajes claros al usuario
5. ✅ Refetch automático de disponibilidad después de crear cita
6. ✅ Validación de campos del formulario (nombre, teléfono, email)

**Código relevante:**
```typescript
// Pre-insert availability check
const existing = await supabase
  .from("appointments")
  .select("staff_id, start_time, end_time, duration_minutes, status")
  .eq("business_id", establishmentId)
  .eq("date", dateStr)
  .in("status", ["pending", "confirmed", "arrived", "started"]);
```

**Estado:** ✅ **ROBUSTO** - Múltiples capas de validación

**Recomendación:**
- ✅ Mantener implementación actual
- ⚠️ Considerar agregar timeout en validación de red (si tarda mucho)
- ⚠️ Agregar indicador de "validando disponibilidad" durante el check

**Impacto:** BAJO - Ya está bien implementado

---

### ✅ FR-2: Manejo de Errores de Red

**Ubicación:** `src/pages/BookingPage.tsx:754-787`

**Análisis:**
- ✅ Try-catch alrededor de creación de cita
- ✅ Mensajes de error específicos (overlap vs genérico)
- ✅ Refetch de disponibilidad después de error
- ✅ Toast notifications para feedback al usuario

**Estado:** ✅ **ADECUADO**

**Recomendación:**
- ⚠️ Considerar agregar retry automático en caso de error de red temporal
- ⚠️ Agregar timeout explícito en llamadas a Supabase
- ✅ Mantener manejo actual de errores

**Impacto:** BAJO - Funcional, mejoras opcionales

---

## ⚠️ NO ENCONTRADO - PRIORIDAD 6: RECIBOS PDF

### ⚠️ RP-1: Recibos PDF - No Implementado o No Encontrado

**Búsqueda realizada:**
- ❌ No se encontraron referencias a `jspdf`, `jsPDF`, `PDF`, `receipt`, `recibo` en el código
- ❌ No hay componente visible para generar o visualizar recibos PDF

**Análisis:**
- ⚠️ Si los recibos PDF son requeridos, **NO están implementados** en la App Cliente
- ⚠️ Solo se encontró en la solicitud del usuario, pero no en el código actual

**Recomendación:**
- ⚠️ **VERIFICAR** si los recibos PDF son requeridos para el lanzamiento
- ⚠️ Si son requeridos:
  - Implementar generación de recibos con jsPDF o similar
  - Agregar visualización de recibos desde AppointmentsPage
  - Asegurar que el formato sea profesional y legible
- ✅ Si NO son requeridos para v1.0, considerar para versión futura

**Impacto:** MEDIO - Depende de requisitos de negocio

---

## 📊 TABLA DE PRIORIDADES

| ID | Hallazgo | Prioridad | Impacto | Esfuerzo | Acción |
|----|----------|-----------|---------|----------|--------|
| **CR-1** | Token Mapbox hardcodeado | 🔴 CRÍTICA | Alto | Bajo | ELIMINAR token |
| **CR-2** | Credenciales Supabase hardcodeadas | 🔴 CRÍTICA | Alto | Medio | Mover a env vars |
| **CR-3** | Debug keystore en release | 🔴 CRÍTICA | Crítico | Bajo | Hacer keystore obligatorio |
| **GL-1** | Permisos ubicación faltantes | 🟡 ALTA | Alto | Bajo | Agregar a manifest |
| **GL-2** | GPS activación automática | 🟡 MEDIA | Medio | Bajo | Eliminar trigger() |
| **AV-1** | ApplicationId revisar | 🟡 MEDIA | Medio | - | Verificar/Confirmar |
| **AV-3** | Iconos adaptativos | 🟡 MEDIA | Medio | - | Revisar manualmente |
| **RP-1** | Recibos PDF no encontrados | ⚠️ MEDIA | Medio | Alto | Verificar requerimiento |

---

## ✅ CHECKLIST PRE-LANZAMIENTO

### Seguridad (OBLIGATORIO)
- [ ] ❌ **CR-1:** Eliminar token Mapbox hardcodeado
- [ ] ❌ **CR-2:** Mover credenciales Supabase a variables de entorno
- [ ] ❌ **CR-3:** Eliminar fallback a debug keystore

### Configuración Android (OBLIGATORIO)
- [ ] ⚠️ **CR-3:** Crear keystore de producción y configurar `keystore.properties`
- [ ] ⚠️ **AV-1:** Confirmar applicationId final (`com.bookwise.client` o `com.mitournow.client`)
- [ ] ⚠️ **AV-3:** Verificar iconos adaptativos manualmente

### Geolocalización (OBLIGATORIO)
- [ ] ❌ **GL-1:** Agregar permisos de ubicación en AndroidManifest.xml
- [ ] ❌ **GL-2:** Eliminar activación automática de GPS

### Funcionalidad (RECOMENDADO)
- [ ] ⚠️ **RP-1:** Verificar/Implementar recibos PDF si son requeridos
- [ ] ✅ **FR-1:** Validaciones de reserva (YA IMPLEMENTADO - OK)
- [ ] ✅ **PR-1:** Términos y Privacidad (YA IMPLEMENTADO - OK)

---

## 🚨 ACCIONES INMEDIATAS REQUERIDAS

### ANTES DE EMPAQUETAR .AAB:

1. **🔴 CRÍTICO - Seguridad:**
   - Eliminar token Mapbox hardcodeado
   - Mover credenciales Supabase a variables de entorno
   - Eliminar fallback a debug keystore

2. **🔴 CRÍTICO - Android:**
   - Crear keystore de producción
   - Configurar `keystore.properties` (NO subir a Git)
   - Verificar que el build release falle si falta keystore

3. **🟡 ALTO - Permisos:**
   - Agregar permisos de ubicación en AndroidManifest.xml
   - Modificar MiTurnowMap para no activar GPS automáticamente

4. **🟡 MEDIO - Verificación:**
   - Confirmar applicationId final
   - Revisar iconos adaptativos manualmente
   - Verificar si recibos PDF son requeridos

---

## 📝 NOTAS ADICIONALES

### Buenas Prácticas Encontradas ✅
- ✅ Validaciones robustas de reserva (múltiples capas)
- ✅ Manejo de errores adecuado
- ✅ Target SDK actualizado (35)
- ✅ Términos y Privacidad implementados
- ✅ Navegación GPS bien implementada (con fallback)

### Áreas de Mejora (No críticas)
- ⚠️ Considerar retry automático en errores de red
- ⚠️ Agregar timeouts explícitos en llamadas a Supabase
- ⚠️ Implementar recibos PDF si son requeridos
- ⚠️ Revisar optimización de recursos del mapa (clustering si hay muchos negocios)

---

## 🎯 CONCLUSIÓN

**Estado General:** 🟡 **REQUIERE CORRECCIONES ANTES DE LANZAR**

**Hallazgos Críticos:** 3  
**Hallazgos de Alta Prioridad:** 2  
**Hallazgos de Media Prioridad:** 3  

**Tiempo estimado de corrección:** 2-4 horas

**Recomendación:** ✅ **CORREGIR** todos los hallazgos críticos y de alta prioridad antes de generar el .AAB para Google Play Store.

---

**Generado:** Enero 2026  
**Versión del informe:** 1.0

