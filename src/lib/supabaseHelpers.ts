/**
 * Helpers para mejorar la confiabilidad de las peticiones a Supabase
 * Incluye timeouts, manejo de errores y retry logic
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ejecuta una petición con timeout y manejo de errores mejorado
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = 'La petición tardó demasiado tiempo'
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId;
        setTimeout(() => {
          reject(new Error(errorMessage));
        }, timeoutMs);
      }),
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || error.message === errorMessage) {
      throw new Error('La conexión se perdió o tardó demasiado. Por favor, intenta de nuevo.');
    }
    throw error;
  }
}

/**
 * Crea una suscripción realtime con manejo de errores y reconexión
 */
export function createRealtimeSubscription(
  supabase: SupabaseClient,
  channelName: string,
  config: {
    table: string;
    filter?: string;
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    onEvent: (payload: any) => void;
    onError?: (error: Error) => void;
    onSubscribe?: () => void;
  }
) {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const subscribe = () => {
    // Limpiar suscripción anterior si existe
    if (channel) {
      supabase.removeChannel(channel);
    }

    channel = supabase
      .channel(channelName)
      .on<{ [key: string]: any }>(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: 'public',
          table: config.table,
          filter: config.filter,
        },
        (payload: any) => {
          try {
            config.onEvent(payload);
            // Resetear contador de reconexión en caso de éxito
            reconnectAttempts = 0;
          } catch (error) {
            console.error(`Error en handler de realtime para ${channelName}:`, error);
            if (config.onError) {
              config.onError(error as Error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${channelName} - Status:`, status);

        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0;
          if (config.onSubscribe) {
            config.onSubscribe();
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[Realtime] ${channelName} - Error o timeout, intentando reconectar...`);
          
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
            
            if (config.onError) {
              config.onError(new Error(`Error de conexión. Reintentando en ${delay}ms...`));
            }

            reconnectTimeout = setTimeout(() => {
              console.log(`[Realtime] ${channelName} - Reintentando conexión (intento ${reconnectAttempts}/${maxReconnectAttempts})`);
              subscribe();
            }, delay);
          } else {
            console.error(`[Realtime] ${channelName} - Máximo de intentos de reconexión alcanzado`);
            if (config.onError) {
              config.onError(new Error('No se pudo establecer la conexión. Por favor, recarga la página.'));
            }
          }
        }
      });

    return channel;
  };

  // Iniciar suscripción
  subscribe();

  // Retornar función de limpieza
  return () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}

/**
 * Wrapper para queries de Supabase con timeout
 * Acepta una promesa de query de Supabase y la ejecuta con timeout
 */
export async function queryWithTimeout<T>(
  queryPromise: Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 20000
): Promise<{ data: T | null; error: any }> {
  try {
    return await withTimeout(queryPromise, timeoutMs, 'La consulta tardó demasiado tiempo');
  } catch (error: any) {
    console.error('Error en queryWithTimeout:', error);
    return {
      data: null,
      error: {
        message: error.message || 'Error de conexión',
        details: 'La petición se agotó. Por favor, verifica tu conexión a internet.',
        code: 'TIMEOUT',
      },
    };
  }
}

