/**
 * Servicio Maestro de Notificaciones para Clientes
 * 
 * Este servicio es la ÚNICA fuente de verdad para enviar notificaciones push desde el Cliente.
 * Todas las notificaciones enviadas manualmente desde el frontend del Cliente deben pasar por este servicio.
 * 
 * CARACTERÍSTICAS:
 * - Usa la función de Supabase 'send-push-notification'
 * - Incluye automáticamente role: 'client' en el body
 * - Registra todas las llamadas con console.log para debugging
 */

import { supabase } from '@/integrations/supabase/client';

export interface ClientNotificationParams {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  notification_id?: string;
}

export interface ClientNotificationResponse {
  success: boolean;
  error?: string;
}

/**
 * Envía una notificación push a través de la Edge Function de Supabase
 * 
 * IMPORTANTE: Este servicio siempre incluye role: 'client' para que la Edge Function
 * use el secret FIREBASE_SERVICE_ACCOUNT_CLIENT correcto.
 * 
 * @param params - Parámetros de la notificación
 * @returns Resultado de la operación
 */
export async function sendClientNotification(
  params: ClientNotificationParams
): Promise<ClientNotificationResponse> {
  try {
    // Preparar el body con role: 'client' siempre incluido
    const data = {
      user_id: params.user_id,
      title: params.title,
      body: params.body,
      role: 'client' as const,
      ...(params.data && { data: params.data }),
      ...(params.notification_id && { notification_id: params.notification_id }),
    };

    // Log antes de enviar para debugging
    console.log('📡 [ClientNotification] ENVIANDO A SUPABASE:', data);

    // Llamar a la Edge Function send-push-notification
    const { data: responseData, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: data,
      }
    );

    if (error) {
      console.error('❌ [ClientNotification] Error al enviar notificación:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al enviar notificación',
      };
    }

    console.log('✅ [ClientNotification] Notificación enviada exitosamente:', responseData);
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ [ClientNotification] Excepción al enviar notificación:', error);
    return {
      success: false,
      error: error?.message || 'Excepción desconocida al enviar notificación',
    };
  }
}


