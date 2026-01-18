/**
 * Servicio Maestro de Notificaciones para Partners
 * 
 * Este servicio es la ÚNICA fuente de verdad para enviar notificaciones push.
 * Todas las notificaciones deben pasar por este servicio.
 * 
 * CARACTERÍSTICAS:
 * - Usa la función de Supabase 'send-push-notification'
 * - Incluye automáticamente role: 'partner' en el body
 * - Registra todas las llamadas con console.log para debugging
 */

import { supabase } from '@/integrations/supabase/client';

export interface PartnerNotificationParams {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  notification_id?: string;
}

export interface PartnerNotificationResponse {
  success: boolean;
  error?: string;
}

/**
 * Envía una notificación push a través de la Edge Function de Supabase
 * 
 * @param params - Parámetros de la notificación
 * @returns Resultado de la operación
 */
export async function sendPartnerNotification(
  params: PartnerNotificationParams
): Promise<PartnerNotificationResponse> {
  try {
    // Preparar el body con role: 'partner' siempre incluido
    const data = {
      user_id: params.user_id,
      title: params.title,
      body: params.body,
      role: 'partner' as const,
      ...(params.data && { data: params.data }),
      ...(params.notification_id && { notification_id: params.notification_id }),
    };

    // Log antes de enviar para debugging
    console.log('📡 ENVIANDO A SUPABASE:', data);

    // Llamar a la Edge Function send-push-notification
    const { data: responseData, error } = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: data,
      }
    );

    if (error) {
      console.error('❌ Error al enviar notificación:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al enviar notificación',
      };
    }

    console.log('✅ Notificación enviada exitosamente:', responseData);
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Excepción al enviar notificación:', error);
    return {
      success: false,
      error: error?.message || 'Excepción desconocida al enviar notificación',
    };
  }
}

