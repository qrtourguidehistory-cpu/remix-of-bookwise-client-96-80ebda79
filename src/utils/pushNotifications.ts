import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Flag para evitar múltiples inicializaciones
 */
let isInitialized = false;
let listenersRegistered = false;

/**
 * Inicializa el sistema de notificaciones push usando EXCLUSIVAMENTE @capacitor/push-notifications
 * 
 * REQUISITOS:
 * - Solo funciona en Android nativo
 * - Debe llamarse DESPUÉS del login (cuando hay userId)
 * - NO debe llamarse más de una vez
 * 
 * FLUJO:
 * 1. Configurar listeners ANTES de registrar
 * 2. Solicitar permisos
 * 3. Crear canal Android (default_channel)
 * 4. Registrar para recibir token FCM
 * 
 * @param userId - ID del usuario autenticado
 */
export async function initPushNotifications(userId: string): Promise<void> {
  // Verificar que es Android nativo
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    console.warn('[Push] ⚠️ No es Android nativo, omitiendo inicialización');
    return;
  }

  // Evitar múltiples inicializaciones
  if (isInitialized) {
    console.warn('[Push] ⚠️ Ya está inicializado, omitiendo');
    return;
  }

  try {
    console.log('[Push] ===== INICIANDO REGISTRO PUSH =====');
    console.log('[Push] UserId:', userId);

    // 1. Configurar listeners ANTES de registrar (CRÍTICO)
    if (!listenersRegistered) {
      console.log('[Push] 📡 Configurando listeners...');

      // Listener: Token FCM recibido
      PushNotifications.addListener('registration', async (token) => {
        console.log('[Push] ✅ Token FCM recibido:', token.value.substring(0, 30) + '...');

        try {
          // Verificar sesión activa
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) {
            console.error('[Push] ❌ No hay sesión activa');
            return;
          }

          // Guardar token en Supabase
          const { error } = await supabase
            .from('client_devices')
            .upsert(
              {
                user_id: userId,
                fcm_token: token.value,
                platform: 'android',
                device_info: {
                  timestamp: new Date().toISOString(),
                  platform_info: Capacitor.getPlatform(),
                },
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'user_id,fcm_token',
              }
            );

          if (error) {
            console.error('[Push] ❌ Error al guardar token:', error);
          } else {
            console.log('[Push] ✅ Token guardado en Supabase');
          }
        } catch (err) {
          console.error('[Push] ❌ Excepción al guardar token:', err);
        }
      });

      // Listener: Error de registro
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] ❌ Error de registro:', err);
      });

      // Listener: Click en notificación (cuando la app se abre)
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[Push] 👆 Notificación clickeada:', notification);
        // Aquí puedes navegar a pantallas específicas según notification.data
      });

      // ⚠️ NO registrar 'pushNotificationReceived' cuando la app está cerrada
      // Si lo registras, Capacitor intercepta las notificaciones y Android NO las muestra
      // automáticamente en el centro de notificaciones.
      // Solo Android debe manejar las notificaciones cuando la app está cerrada.

      listenersRegistered = true;
      console.log('[Push] ✅ Listeners configurados');
    }

    // 2. Solicitar permisos
    console.log('[Push] 🔐 Solicitando permisos...');
    const perm = await PushNotifications.requestPermissions();
    
    if (perm.receive !== 'granted') {
      console.warn('[Push] ⚠️ Permisos denegados');
      return;
    }

    console.log('[Push] ✅ Permisos concedidos');

    // 3. Crear canal Android (CRÍTICO para Android 8.0+)
    // El canal DEBE existir ANTES de recibir notificaciones
    console.log('[Push] 📢 Creando canal "default_channel"...');
    
    try {
      // Intentar eliminar canal anterior si existe (para recrearlo con configuración correcta)
      try {
        await LocalNotifications.deleteChannel({ id: 'default_channel' });
      } catch {
        // Ignorar si no existe
      }

      // Crear canal con importancia HIGH
      await LocalNotifications.createChannel({
        id: 'default_channel',
        name: 'Notificaciones',
        description: 'Notificaciones importantes de la app',
        importance: 5, // IMPORTANCE_HIGH - muestra con app cerrada y pantalla bloqueada
        sound: 'default',
        vibration: true,
        visibility: 1, // VISIBILITY_PUBLIC - muestra contenido completo
      });

      console.log('[Push] ✅ Canal creado (importance: HIGH)');
    } catch (channelError) {
      console.error('[Push] ❌ Error al crear canal:', channelError);
      throw new Error(`No se pudo crear el canal: ${channelError}`);
    }

    // 4. Registrar para recibir token FCM
    console.log('[Push] 📝 Registrando push notifications...');
    await PushNotifications.register();
    console.log('[Push] ✅ Registro completado');

    isInitialized = true;
    console.log('[Push] ✅✅✅ INICIALIZACIÓN COMPLETADA ✅✅✅');
  } catch (error) {
    console.error('[Push] ❌❌❌ ERROR CRÍTICO ❌❌❌');
    console.error('[Push] Error:', error);
    isInitialized = false; // Permitir reintento
    throw error;
  }
}

/**
 * Resetear estado (útil para logout o testing)
 */
export function resetPushNotificationsState(): void {
  isInitialized = false;
  listenersRegistered = false;
  console.log('[Push] 🔄 Estado reseteado');
}

