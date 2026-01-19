# 🛡️ ZONA PROTEGIDA - NOTIFICACIONES PUSH

**Estado:** ✅ **FUNCIONANDO AL 100%**  
**Fecha de Protección:** 18 de Enero, 2026  
**Prioridad:** 🔴 **CRÍTICA - NO MODIFICAR**

---

## ⚠️ ADVERTENCIA CRÍTICA

**Las notificaciones push (Partner y Cliente) están completamente funcionales.**  
**CUALQUIER MODIFICACIÓN A ESTOS COMPONENTES PUEDE ROMPER EL SISTEMA.**

---

## 🚫 COMPONENTES PROTEGIDOS (SOLO LECTURA)

### 1. Edge Function: `send-push-notification`
**Ubicación:** `supabase/functions/send-push-notification/`

**Prohibido modificar:**
- ❌ Cualquier archivo dentro de `supabase/functions/send-push-notification/`
- ❌ `index.ts` o cualquier otro archivo de la función
- ❌ Lógica de normalización de roles
- ❌ Lógica de selección de Service Accounts
- ❌ Cualquier configuración relacionada

### 2. Secretos de Supabase
**Prohibido modificar:**
- ❌ `FIREBASE_SERVICE_ACCOUNT_PARTNER`
- ❌ `FIREBASE_SERVICE_ACCOUNT_CLIENT`
- ❌ Cualquier secreto relacionado con Firebase

### 3. Funciones SQL y Triggers
**Prohibido modificar:**
- ❌ `public.call_send_push_notification()`
- ❌ `public.send_push_on_appointment_notification()`
- ❌ `public.create_appointment_status_notification()`
- ❌ `public.get_client_user_id_from_appointment()`
- ❌ `trigger_send_push_on_appointment_notification`
- ❌ `trigger_create_appointment_status_notification`
- ❌ Cualquier función o trigger relacionado con notificaciones push

### 4. Configuración de Autenticación
**Prohibido modificar:**
- ❌ Configuración de Google Sign-In
- ❌ Configuración de Firebase
- ❌ Service Accounts de Firebase
- ❌ Credenciales de autenticación

---

## ✅ QUÉ SÍ SE PUEDE HACER

- ✅ Leer y revisar código relacionado
- ✅ Agregar logging para diagnóstico (sin cambiar la lógica)
- ✅ Corregir bugs en otras partes del sistema (asegurándose de no afectar estas dependencias)
- ✅ Mejorar otras funcionalidades no relacionadas

---

## 🔍 ANTES DE HACER CUALQUIER CAMBIO

1. **Verificar si el cambio afecta alguna de las áreas protegidas**
2. **Si hay duda, NO hacer el cambio sin confirmación explícita**
3. **Siempre respetar estas restricciones**

---

## 📝 NOTAS

- El sistema de notificaciones push está completamente funcional
- Partner y Cliente reciben notificaciones correctamente
- Los secretos y configuraciones están correctamente establecidos
- Cualquier modificación no autorizada puede romper el flujo completo

---

**Última actualización:** 18 de Enero, 2026  
**Estado del sistema:** ✅ OPERATIVO AL 100%


