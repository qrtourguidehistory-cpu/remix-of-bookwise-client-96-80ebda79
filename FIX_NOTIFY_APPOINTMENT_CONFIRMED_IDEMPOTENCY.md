# 🔧 FIX: Idempotencia en notify-appointment-confirmed

## Problema
La Edge Function `notify-appointment-confirmed` se ejecuta múltiples veces por una sola confirmación de cita, causando 3-4 notificaciones duplicadas.

## Solución
Agregar verificación de idempotencia en la Edge Function antes de enviar push notifications.

## Cambios Requeridos

### 1. Modificar Edge Function `notify-appointment-confirmed`

**Archivo:** `supabase/functions/notify-appointment-confirmed/index.ts`

**Agregar al inicio de la función (después de validar `appointment_id`):**

```typescript
// ✅ IDEMPOTENCIA: Verificar si ya se envió una notificación para esta cita
const { data: alreadySent, error: checkError } = await supabase
  .from('push_notification_sent')
  .select('id, sent_at')
  .eq('appointment_id', appointment_id)
  .eq('notification_type', 'confirmation')
  .eq('edge_function', 'notify-appointment-confirmed')
  .gt('sent_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Últimos 30 minutos
  .maybeSingle();

if (checkError) {
  console.warn('⚠️ [notify-appointment-confirmed] Error al verificar idempotencia:', checkError);
  // Continuar con el envío si hay error al verificar (fail-open)
} else if (alreadySent) {
  console.log('PUSH::SKIPPED::already_sent', {
    appointment_id,
    notification_type: 'confirmation',
    edge_function: 'notify-appointment-confirmed',
    reason: 'Ya se envió push en los últimos 30 minutos',
    sent_at: alreadySent.sent_at
  });
  
  return new Response(
    JSON.stringify({
      success: true,
      pushSent: false,
      skipped: true,
      reason: 'already_sent',
      sent_at: alreadySent.sent_at,
      appointment_id: appointment_id,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Agregar al final de la función (después de enviar push exitosamente, antes del return final):**

```typescript
// ✅ REGISTRAR que se envió la notificación (idempotencia)
if (successful > 0) {
  try {
    const { error: recordError } = await supabase
      .from('push_notification_sent')
      .upsert({
        appointment_id: appointment_id,
        notification_type: 'confirmation',
        edge_function: 'notify-appointment-confirmed',
        user_id: clientUserId,
        sent_at: new Date().toISOString()
      }, {
        onConflict: 'appointment_id,notification_type,edge_function'
      });
    
    if (recordError) {
      console.warn('⚠️ [notify-appointment-confirmed] Error al registrar notificación enviada:', recordError);
    } else {
      console.log('✅ [notify-appointment-confirmed] Notificación registrada en push_notification_sent');
    }
  } catch (err) {
    console.warn('⚠️ [notify-appointment-confirmed] Excepción al registrar notificación:', err);
  }
}
```

## Código Completo de la Sección Relevante

```typescript
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { appointment_id }: RequestBody = await req.json();
    
    console.log("📨 [notify-appointment-confirmed] Evento: Cita confirmada");
    console.log("📋 [notify-appointment-confirmed] appointment_id:", appointment_id);
    
    // ✅ VALIDACIÓN 1: appointment_id es obligatorio
    if (!appointment_id || typeof appointment_id !== 'string' || appointment_id.trim() === '') {
      console.error("❌ [notify-appointment-confirmed] appointment_id es requerido");
      return new Response(
        JSON.stringify({ success: false, error: "appointment_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ [notify-appointment-confirmed] Supabase credentials no configuradas");
      return new Response(
        JSON.stringify({ success: false, error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ✅ IDEMPOTENCIA: Verificar si ya se envió una notificación para esta cita
    const { data: alreadySent, error: checkError } = await supabase
      .from('push_notification_sent')
      .select('id, sent_at')
      .eq('appointment_id', appointment_id)
      .eq('notification_type', 'confirmation')
      .eq('edge_function', 'notify-appointment-confirmed')
      .gt('sent_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Últimos 30 minutos
      .maybeSingle();

    if (checkError) {
      console.warn('⚠️ [notify-appointment-confirmed] Error al verificar idempotencia:', checkError);
      // Continuar con el envío si hay error al verificar (fail-open)
    } else if (alreadySent) {
      console.log('PUSH::SKIPPED::already_sent', {
        appointment_id,
        notification_type: 'confirmation',
        edge_function: 'notify-appointment-confirmed',
        reason: 'Ya se envió push en los últimos 30 minutos',
        sent_at: alreadySent.sent_at
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          pushSent: false,
          skipped: true,
          reason: 'already_sent',
          sent_at: alreadySent.sent_at,
          appointment_id: appointment_id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ... resto del código existente ...

    // ✅ PASO 6: Enviar push token por token (nunca batch)
    const results = await Promise.allSettled(
      devices.map(async (device: Device) => {
        // ... código existente ...
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`📊 [notify-appointment-confirmed] Resultados: ${successful} exitosos, ${failed} fallidos`);

    // ✅ REGISTRAR que se envió la notificación (idempotencia)
    if (successful > 0) {
      try {
        const { error: recordError } = await supabase
          .from('push_notification_sent')
          .upsert({
            appointment_id: appointment_id,
            notification_type: 'confirmation',
            edge_function: 'notify-appointment-confirmed',
            user_id: clientUserId,
            sent_at: new Date().toISOString()
          }, {
            onConflict: 'appointment_id,notification_type,edge_function'
          });
        
        if (recordError) {
          console.warn('⚠️ [notify-appointment-confirmed] Error al registrar notificación enviada:', recordError);
        } else {
          console.log('✅ [notify-appointment-confirmed] Notificación registrada en push_notification_sent');
        }
      } catch (err) {
        console.warn('⚠️ [notify-appointment-confirmed] Excepción al registrar notificación:', err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pushSent: successful > 0,
        sent: successful,
        failed: failed,
        total: devices.length,
        appointment_id: appointment_id,
        user_id: clientUserId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ [notify-appointment-confirmed] Error general:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

## Pasos para Aplicar

1. **Aplicar la migración SQL:**
   ```bash
   # La migración ya está creada en:
   # supabase/migrations/20260202000000_add_idempotency_push_notifications.sql
   ```

2. **Modificar la Edge Function:**
   - Abrir `supabase/functions/notify-appointment-confirmed/index.ts`
   - Agregar la verificación de idempotencia al inicio
   - Agregar el registro de notificación enviada al final

3. **Desplegar la Edge Function:**
   ```bash
   supabase functions deploy notify-appointment-confirmed
   ```

## Resultado Esperado

Después de estos cambios:

1. **1 confirmación → 1 ejecución → 1 notificación**
2. Si `notify-appointment-confirmed` se llama múltiples veces, solo la primera ejecución enviará push
3. Las siguientes ejecuciones mostrarán: `PUSH::SKIPPED::already_sent`
4. Los logs serán claros y consistentes

## Verificación

Para verificar que funciona:

1. Confirmar una cita desde la app Partner
2. Verificar logs en Supabase:
   - Debe aparecer `PUSH::SKIPPED::already_sent` si se intenta enviar múltiples veces
   - Solo debe haber UN registro en `push_notification_sent` para esa cita
3. Verificar que el cliente recibe solo UNA notificación

