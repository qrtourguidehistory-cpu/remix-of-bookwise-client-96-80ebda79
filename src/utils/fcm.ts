import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Flag para evitar múltiples inicializaciones
let isInitialized = false;
let listenersRegistered = false;

/**
 * Inicializa FCM usando EXCLUSIVAMENTE @capacitor/push-notifications
 * Se ejecuta SOLO después del login
 */
export async function initFCM(userId: string) {
  // Verificación exhaustiva de plataforma
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  console.log('[FCM] ===== INICIANDO REGISTRO FCM =====');
  console.log('[FCM] Platform:', platform);
  console.log('[FCM] isNativePlatform():', isNative);
  console.log('[FCM] userId:', userId);
  
  if (!isNative || platform !== 'android') {
    console.warn('[FCM] ⚠️ No es Android nativo, omitiendo inicialización');
    console.warn('[FCM] Platform:', platform, 'isNative:', isNative);
    return;
  }

  // Evitar múltiples inicializaciones
  if (isInitialized) {
    console.warn('[FCM] ⚠️ FCM ya está inicializado, omitiendo');
    return;
  }

  try {
    // 1. Configurar listeners ANTES de registrar (CRÍTICO)
    if (!listenersRegistered) {
      console.log('[FCM] 📡 Configurando listeners...');
      
      // Listener para cuando se recibe el token
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCM] ===== TOKEN FCM RECIBIDO =====');
        console.log('[FCM] Token completo:', token.value);
        console.log('[FCM] Token length:', token.value.length);

        try {
          // Verificar sesión antes de guardar
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.error('[FCM] ❌ No hay sesión activa:', sessionError);
            return;
          }

          console.log('[FCM] ✅ Sesión verificada, guardando token...');
          console.log('[FCM] userId a guardar:', userId);
          console.log('[FCM] fcm_token a guardar:', token.value.substring(0, 30) + '...');

          // Guardar token en Supabase
          const { data, error } = await supabase
            .from('client_devices')
            .upsert(
              {
                user_id: userId,
                fcm_token: token.value,
                platform: 'android',
                device_info: {
                  timestamp: new Date().toISOString(),
                  app_version: '1.0.0',
                  platform_info: platform,
                },
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: 'user_id,fcm_token',
              }
            )
            .select();

          if (error) {
            console.error('[FCM] ❌ Error al guardar token en Supabase:');
            console.error('[FCM] Error code:', error.code);
            console.error('[FCM] Error message:', error.message);
            console.error('[FCM] Error details:', JSON.stringify(error, null, 2));
            return;
          }

          console.log('[FCM] ✅✅✅ TOKEN GUARDADO EXITOSAMENTE EN SUPABASE ✅✅✅');
          console.log('[FCM] Registro creado:', JSON.stringify(data, null, 2));
        } catch (err) {
          console.error('[FCM] ❌ Excepción al guardar token:', err);
          if (err instanceof Error) {
            console.error('[FCM] Error stack:', err.stack);
          }
        }
      });

      // Listener para errores de registro
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[FCM] ❌❌❌ ERROR DE REGISTRO FCM ❌❌❌');
        console.error('[FCM] Error:', JSON.stringify(err, null, 2));
      });

      // ⚠️ NO registrar 'pushNotificationReceived' cuando la app está cerrada
      // Si registras este listener, Capacitor intercepta las notificaciones y
      // Android NO las muestra automáticamente en el centro de notificaciones.
      // Solo Android debe manejar las notificaciones cuando la app está cerrada.
      // 
      // Si necesitas procesar notificaciones cuando la app está ABIERTA, puedes
      // registrar este listener solo cuando la app está en foreground, pero
      // para notificaciones con app cerrada, NO lo registres.

      // Listener para cuando se hace clic en una notificación (cuando la app se abre)
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[FCM] 👆 Notificación clickeada:', JSON.stringify(notification, null, 2));
        // Aquí puedes navegar a la pantalla correspondiente cuando el usuario hace clic
      });

      listenersRegistered = true;
      console.log('[FCM] ✅ Listeners configurados correctamente');
    }

    // 2. Solicitar permisos
    console.log('[FCM] 🔐 Solicitando permisos de notificaciones...');
    const perm = await PushNotifications.requestPermissions();
    console.log('[FCM] Resultado de permisos:', JSON.stringify(perm, null, 2));

    if (perm.receive !== 'granted') {
      console.warn('[FCM] ⚠️ Permisos de notificaciones denegados');
      console.warn('[FCM] Estado de permisos:', perm);
      return;
    }

    console.log('[FCM] ✅ Permisos concedidos');

    // 3. Crear canal de notificaciones (CRÍTICO para Android 8.0+)
    // El canal DEBE existir ANTES de recibir notificaciones push
    // Si el canal no existe cuando llega una notificación, Android la ignora o usa un canal por defecto con baja importancia
    console.log('[FCM] 📢 Creando canal de notificaciones "default_channel"...');
    try {
      // Intentar eliminar el canal primero si existe (para recrearlo con la configuración correcta)
      try {
        await LocalNotifications.deleteChannel({ id: 'default_channel' });
        console.log('[FCM] 🔄 Canal anterior eliminado (si existía)');
      } catch (deleteError) {
        // Ignorar error si el canal no existe
      }

      // Crear el canal con configuración explícita para notificaciones de alta prioridad
      await LocalNotifications.createChannel({
        id: 'default_channel',
        name: 'Notificaciones',
        description: 'Notificaciones importantes de la app',
        importance: 5, // IMPORTANCE_HIGH - muestra notificaciones incluso con app cerrada y pantalla bloqueada
        sound: 'default',
        vibration: true,
        visibility: 1, // VISIBILITY_PUBLIC - muestra contenido completo incluso en pantalla bloqueada
      });
      console.log('[FCM] ✅✅✅ Canal de notificaciones creado exitosamente ✅✅✅');
      console.log('[FCM] Canal ID: default_channel');
      console.log('[FCM] Importancia: HIGH (5)');
      console.log('[FCM] Visibilidad: PÚBLICA');
    } catch (channelError) {
      console.error('[FCM] ❌❌❌ ERROR CRÍTICO al crear canal ❌❌❌');
      console.error('[FCM] Error:', channelError);
      // NO continuar si el canal no se puede crear - esto es crítico
      throw new Error(`No se pudo crear el canal de notificaciones: ${channelError}`);
    }

    // 4. Registrar para recibir token (DESPUÉS de configurar listeners y canal)
    console.log('[FCM] 📝 Llamando a PushNotifications.register()...');
    await PushNotifications.register();
    console.log('[FCM] ✅ PushNotifications.register() llamado exitosamente');
    
    isInitialized = true;
    console.log('[FCM] ✅✅✅ INICIALIZACIÓN FCM COMPLETADA ✅✅✅');
  } catch (error) {
    console.error('[FCM] ❌❌❌ ERROR CRÍTICO AL INICIALIZAR FCM ❌❌❌');
    console.error('[FCM] Error:', error);
    if (error instanceof Error) {
      console.error('[FCM] Error message:', error.message);
      console.error('[FCM] Error stack:', error.stack);
    }
    isInitialized = false; // Permitir reintento
  }
}

/**
 * Resetear estado (útil para testing o logout)
 */
export function resetFCMState() {
  isInitialized = false;
  listenersRegistered = false;
  console.log('[FCM] 🔄 Estado de FCM reseteado');
}

