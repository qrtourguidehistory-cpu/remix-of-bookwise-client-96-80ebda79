# 🔍 AUDITORÍA: Notificaciones Push de Partner → Cliente

**Fecha:** 18 de Enero, 2026  
**Problema:** Las notificaciones push no llegan al cliente cuando el partner confirma o cambia el estatus de una cita.

---

## 📊 RESUMEN EJECUTIVO

**Estado Actual:**
- ✅ Las notificaciones se crean correctamente en `appointment_notifications`
- ✅ Los triggers están activos
- ✅ Los dispositivos están registrados (al menos para algunos usuarios)
- ❌ **PROBLEMA:** Hay errores 400 en la Edge Function cuando se intenta enviar

**Causa Raíz Identificada:**
El trigger `send_push_on_appointment_notification` NO tenía la lógica para forzar `role='client'` en confirmaciones, y la función `call_send_push_notification` no normalizaba el role a minúsculas.

---

## 🔄 FLUJO ACTUAL (Paso a Paso)

### Paso 1: Partner confirma cita
```sql
UPDATE appointments SET status = 'confirmed' WHERE id = 'xxx'
```
**Estado:** ✅ Funciona correctamente

### Paso 2: Trigger `trigger_create_appointment_status_notification`
- Detecta cambio de status
- Obtiene `user_id` del cliente con `get_client_user_id_from_appointment()`
- Crea registro en `appointment_notifications` con:
  - `user_id`: ✅ Incluido
  - `role`: ✅ `'client'` (minúsculas)
  - `meta->>'type'`: ✅ `'confirmation'`
**Estado:** ✅ Funciona correctamente

### Paso 3: Trigger `trigger_send_push_on_appointment_notification`
- Detecta INSERT en `appointment_notifications`
- **ANTES (PROBLEMA):** No forzaba `role='client'` para confirmaciones
- **DESPUÉS (CORREGIDO):** Ahora detecta `type='confirmation'` y fuerza `role='client'`
- Llama a `call_send_push_notification()` con los parámetros
**Estado:** ✅ Corregido en migración reciente

### Paso 4: Función `call_send_push_notification`
- **ANTES (PROBLEMA):** No normalizaba el role a minúsculas
- **DESPUÉS (CORREGIDO):** Normaliza role con `LOWER(TRIM(...))`
- Construye payload JSON para Edge Function
- Usa `pg_net.http_post()` para llamar a la Edge Function
**Estado:** ✅ Corregido en migración reciente

### Paso 5: Edge Function `send-push-notification`
- Recibe payload con `user_id`, `role`, `title`, `body`
- **ANTES (PROBLEMA):** No normalizaba role antes de buscar dispositivos
- **DESPUÉS (CORREGIDO):** Normaliza role a minúsculas antes de todo
- Busca en `client_devices` con `user_id` y `role='client'`
- Envía notificación FCM
**Estado:** ✅ Corregido (versión 85)

---

## 🔍 HALLAZGOS DE LA AUDITORÍA

### ✅ Aspectos que Funcionan Correctamente

1. **Creación de Notificaciones:**
   - Las notificaciones se crean en `appointment_notifications` con `user_id` y `role='client'`
   - La función `get_client_user_id_from_appointment()` funciona correctamente

2. **Registro de Dispositivos:**
   - Hay dispositivos registrados en `client_devices` con `role='client'`
   - Ejemplo: Usuario `7ab6a213-7bfe-49ec-bcfc-381966609dff` tiene dispositivo registrado

3. **Triggers Activos:**
   - `trigger_create_appointment_status_notification`: ✅ Activo
   - `trigger_send_push_on_appointment_notification`: ✅ Activo

### ❌ Problemas Identificados y Corregidos

1. **Trigger no forzaba role='client' para confirmaciones:**
   - **Problema:** El trigger usaba `recipient_type` para determinar el role, pero para confirmaciones debería SIEMPRE ser 'client'
   - **Solución:** Agregada lógica que detecta `type='confirmation'` y fuerza `role='client'`

2. **Role no se normalizaba a minúsculas:**
   - **Problema:** Si el role venía con mayúsculas, no coincidía con la tabla (`'client'` vs `'CLIENT'`)
   - **Solución:** Normalización con `.toLowerCase().trim()` en Edge Function y `LOWER(TRIM())` en PostgreSQL

3. **Falta de validación de parámetros:**
   - **Problema:** No se validaba que `user_id` y `role` no fueran NULL antes de llamar a la Edge Function
   - **Solución:** Validaciones agregadas en `call_send_push_notification`

4. **Logging insuficiente:**
   - **Problema:** No había suficiente información para diagnosticar problemas
   - **Solución:** Logs detallados agregados en cada paso del proceso

---

## 📝 VERIFICACIONES REALIZADAS

### 1. Citas Confirmadas Recientes
```sql
SELECT COUNT(*) as citas_confirmadas_con_user_id
FROM appointments 
WHERE status = 'confirmed' 
  AND user_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '24 hours';
```
**Resultado:** Múltiples citas confirmadas con `user_id` válido ✅

### 2. Notificaciones Creadas
```sql
SELECT COUNT(*) as notificaciones_confirmacion
FROM appointment_notifications
WHERE meta->>'type' = 'confirmation'
  AND created_at > NOW() - INTERVAL '24 hours';
```
**Resultado:** Las notificaciones se están creando correctamente ✅

### 3. Dispositivos Registrados
```sql
SELECT user_id, COUNT(*) as dispositivos
FROM client_devices
WHERE role = 'client' AND enabled = true
GROUP BY user_id;
```
**Resultado:** Hay dispositivos registrados para algunos usuarios ✅

### 4. Errores en Edge Function
**Resultado:** Múltiples errores 400 detectados en logs ❌
**Causa Probable:** Payload con datos faltantes o role incorrecto

---

## 🔧 CORRECCIONES APLICADAS

### Migración: `audit_fix_client_confirmation_push`

1. **Trigger `send_push_on_appointment_notification`:**
   - ✅ Detecta `type='confirmation'` y fuerza `role='client'`
   - ✅ Validación de `user_id` antes de continuar
   - ✅ Logging mejorado para diagnóstico

2. **Función `call_send_push_notification`:**
   - ✅ Normaliza `role` a minúsculas con `LOWER(TRIM())`
   - ✅ Validación de parámetros (user_id, title, body)
   - ✅ Logging detallado antes y después de llamar a Edge Function

3. **Edge Function `send-push-notification` (versión 85):**
   - ✅ Normaliza `role` a minúsculas ANTES de determinar servicio
   - ✅ Log específico: `DEBUG: Buscando token para user [ID] con el rol exacto: [ROL]`
   - ✅ Log: `DEBUG: Consultando client_devices para user: [ID] y role: [ROL]`

---

## 🧪 PRUEBAS RECOMENDADAS

1. **Probar Confirmación de Cita:**
   - Partner confirma una cita desde la app Partner
   - Verificar logs de Edge Function para ver:
     - `DEBUG: Buscando token para user [ID] con el rol exacto: client`
     - `DEBUG: Consultando client_devices para user: [ID] y role: client`
   - Verificar que la notificación llegue al cliente

2. **Verificar Dispositivos:**
   - Asegurar que el cliente tenga dispositivo registrado en `client_devices` con `role='client'`
   - Verificar que el dispositivo esté `enabled = true`

3. **Verificar Logs:**
   - Revisar logs de PostgreSQL para ver mensajes `[Push]`
   - Revisar logs de Edge Function para ver errores o warnings

---

## ⚠️ PROBLEMAS POTENCIALES RESTANTES

1. **Usuarios sin Dispositivos Registrados:**
   - Algunos usuarios tienen citas confirmadas pero no tienen dispositivos registrados
   - **Impacto:** Las notificaciones no se pueden enviar (no hay dispositivo destino)
   - **Solución:** Asegurar que los clientes registren sus dispositivos al abrir la app

2. **Errores 400 en Edge Function:**
   - Hay múltiples errores 400 en los logs
   - **Posible Causa:** Payload malformado o datos faltantes
   - **Solución:** Los nuevos logs deberían revelar la causa exacta

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Trigger `trigger_create_appointment_status_notification` crea notificaciones con `user_id`
- [x] Trigger `trigger_send_push_on_appointment_notification` fuerza `role='client'` para confirmaciones
- [x] Función `call_send_push_notification` normaliza role a minúsculas
- [x] Edge Function normaliza role a minúsculas antes de buscar dispositivos
- [x] Edge Function busca en `client_devices` (no en `partner_devices`)
- [x] Edge Function filtra por `role='client'` en la consulta SQL
- [x] Logging detallado agregado en cada paso
- [ ] **PENDIENTE:** Probar flujo completo end-to-end
- [ ] **PENDIENTE:** Verificar que dispositivos estén habilitados

---

## 📋 PRÓXIMOS PASOS

1. **Probar el flujo completo:**
   - Partner confirma una cita
   - Verificar logs en tiempo real
   - Verificar que la notificación llegue al cliente

2. **Si aún falla, verificar:**
   - Que el dispositivo del cliente esté registrado y habilitado
   - Que el `user_id` en la cita corresponda al cliente correcto
   - Que los secretos de Firebase estén configurados correctamente

3. **Monitorear logs:**
   - Revisar mensajes `[Push]` en logs de PostgreSQL
   - Revisar logs de Edge Function para errores específicos

