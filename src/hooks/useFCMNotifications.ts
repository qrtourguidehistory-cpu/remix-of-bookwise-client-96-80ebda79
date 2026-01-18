import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface FCMNotificationData {
  type?: string;
  appointment_id?: string;
  business_id?: string;
  [key: string]: string | undefined;
}

interface ClientDevice {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: string;
  device_info: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const useFCMNotifications = (userId: string | undefined) => {
  const navigate = useNavigate();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listenersRegistered = useRef(false);
  const initializationAttempted = useRef<string | null>(null); // Track which userId was attempted
  const registrationCalled = useRef(false); // Track if register() was called

  // Register FCM token in database using UPSERT to avoid duplicates
  // This function handles token registration/update in client_devices table
  const registerToken = useCallback(async (token: string, currentUserId: string) => {
    const platform = Capacitor.getPlatform();
    
    try {
      console.log('📱 [FCM] Token generado:', token.substring(0, 20) + '...');
      console.log('📱 [FCM] Registrando token para usuario:', currentUserId);
      console.log('📱 [FCM] Plataforma:', platform);
      
      // Get the current session for auth header
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [FCM] Error al obtener sesión:', sessionError);
        // No bloquear la app, solo loguear el error
        return;
      }
      
      if (!session?.access_token) {
        console.warn('⚠️ [FCM] No hay sesión activa, no se puede registrar el token');
        // No bloquear la app, solo loguear la advertencia
        return;
      }
      
      // Use Supabase client for UPSERT operation
      // UPSERT: Si existe un registro con el mismo user_id y fcm_token, lo actualiza
      // Si no existe, lo crea
      // La constraint única es client_devices_user_token_unique (user_id, fcm_token)
      const { data, error } = await supabase
        .from('client_devices')
        .upsert(
          {
            user_id: currentUserId,
            fcm_token: token,
            platform: platform === 'android' ? 'android' : platform, // Asegurar 'android' para Android
            device_info: {
              userAgent: navigator.userAgent || 'unknown',
              timestamp: new Date().toISOString(),
              appVersion: '1.0.0', // Puedes obtener esto de package.json o config
            },
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'client_devices_user_token_unique', // Usar el nombre de la constraint única
            ignoreDuplicates: false // Actualizar en lugar de ignorar
          }
        )
        .select();
      
      if (error) {
        console.error('❌ [FCM] Error al registrar token en Supabase:', error);
        console.error('❌ [FCM] Detalles del error:', JSON.stringify(error, null, 2));
        // No bloquear la app, solo loguear el error
        setError(`Error al registrar token: ${error.message}`);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('✅ [FCM] Token registrado/actualizado exitosamente en Supabase');
        console.log('✅ [FCM] Registro ID:', data[0].id);
        console.log('✅ [FCM] Token guardado:', data[0].fcm_token?.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ [FCM] Token registrado pero no se recibió confirmación');
      }
      
    } catch (err) {
      // No bloquear la app si falla el registro del token
      console.error('❌ [FCM] Excepción al registrar token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al registrar token';
      console.error('❌ [FCM] Mensaje de error:', errorMessage);
      setError(errorMessage);
      // No lanzar el error, solo loguearlo para no bloquear la app
    }
  }, []);

  // Handle navigation when notification is tapped
  const handleNotificationNavigation = useCallback((data: FCMNotificationData) => {
    console.log('📱 FCM: Handling notification navigation:', data);
    
    if (data?.type === 'appointment' && data?.appointment_id) {
      navigate('/appointments');
    } else if (data?.type === 'review' && data?.business_id) {
      navigate(`/business/${data.business_id}`);
    } else if (data?.type === 'early_arrival' && data?.appointment_id) {
      navigate('/appointments');
    } else if (data?.business_id) {
      navigate(`/business/${data.business_id}`);
    } else {
      // Default: go to appointments
      navigate('/appointments');
    }
  }, [navigate]);

  // Initialize FCM with proper Android 13+ permission handling
  const initializeFCM = useCallback(async () => {
    console.log('🚀 [FCM] ===== INICIO DE initializeFCM =====');
    console.log('📱 [FCM] Plataforma detectada:', Capacitor.getPlatform());
    console.log('📱 [FCM] Es plataforma nativa?', Capacitor.isNativePlatform());
    console.log('📱 [FCM] userId recibido:', userId);
    console.log('📱 [FCM] userId anterior intentado:', initializationAttempted.current);
    
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ [FCM] No es plataforma nativa, omitiendo inicialización');
      setIsLoading(false);
      return;
    }

    if (!userId) {
      console.log('⚠️ [FCM] No hay user ID, omitiendo inicialización');
      setIsLoading(false);
      return;
    }

    // Verificar sesión activa antes de continuar
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.warn('⚠️ [FCM] No hay sesión activa, esperando...', sessionError);
      setIsLoading(false);
      return;
    }
    console.log('✅ [FCM] Sesión activa confirmada para usuario:', session.user.id);

    // Permitir reintentos si el usuario cambia o si no se ha llamado register() aún
    if (initializationAttempted.current === userId && registrationCalled.current) {
      console.log('ℹ️ [FCM] Ya se intentó inicialización para este usuario y register() fue llamado');
      return;
    }

    // Si cambió el usuario, resetear el flag
    if (initializationAttempted.current !== userId) {
      console.log('🔄 [FCM] Usuario cambió, reiniciando inicialización');
      initializationAttempted.current = userId;
      registrationCalled.current = false;
    }

    console.log('✅ [FCM] Iniciando inicialización de FCM...');
    console.log('📱 [FCM] Usuario:', userId);
    console.log('📱 [FCM] Plataforma:', Capacitor.getPlatform());

    try {
      // Dynamically import to avoid issues on web
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();
      console.log('📱 [FCM] Estado actual de permisos:', permStatus.receive);
      
      // Request permission if needed (Android 13+ requires POST_NOTIFICATIONS permission)
      if (permStatus.receive === 'prompt' || permStatus.receive === 'denied') {
        console.log('📱 [FCM] Solicitando permisos de notificaciones...');
        permStatus = await PushNotifications.requestPermissions();
        console.log('📱 [FCM] Resultado de permisos:', permStatus.receive);
      }
      
      if (permStatus.receive !== 'granted') {
        console.warn('⚠️ [FCM] Permisos de notificaciones denegados');
        setHasPermission(false);
        setIsLoading(false);
        setError('Permisos de notificaciones denegados. Por favor, habilítalos en configuración.');
        // No bloquear la app, solo informar al usuario
        return;
      }
      
      setHasPermission(true);
      console.log('✅ [FCM] Permisos de notificaciones concedidos');
      
      // Register listeners only once
      if (!listenersRegistered.current) {
        listenersRegistered.current = true;
        console.log('📱 [FCM] Registrando listeners de FCM...');
        
        // Token registration listener - se ejecuta cuando se obtiene el token FCM
        await PushNotifications.addListener('registration', async (token) => {
          const tokenValue = token.value;
          console.log('🎉 [FCM] ===== TOKEN FCM GENERADO =====');
          console.log('✅ [FCM] Token FCM recibido:', tokenValue.substring(0, 30) + '...');
          console.log('📱 [FCM] Longitud del token:', tokenValue.length);
          console.log('📱 [FCM] Token completo (primeros 50 chars):', tokenValue.substring(0, 50));
          setFcmToken(tokenValue);
          
          // Registrar token en Supabase inmediatamente
          if (userId) {
            console.log('📤 [FCM] ===== INICIANDO UPSERT A client_devices =====');
            console.log('📱 [FCM] userId:', userId);
            console.log('📱 [FCM] fcm_token:', tokenValue.substring(0, 30) + '...');
            console.log('📱 [FCM] platform:', Capacitor.getPlatform());
            await registerToken(tokenValue, userId);
          } else {
            console.warn('⚠️ [FCM] No hay userId, no se puede registrar el token');
          }
        });
        
        // Registration error listener
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('❌ [FCM] Error al registrar FCM:', err);
          console.error('❌ [FCM] Detalles del error:', JSON.stringify(err, null, 2));
          setError(`Error al registrar FCM: ${err.error || 'Error desconocido'}`);
          // No bloquear la app, solo informar
        });
        
        // Foreground notification listener
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 [FCM] Notificación recibida (foreground):', notification);
          // Puedes mostrar un toast o notificación in-app aquí
        });
        
        // Notification tap listener
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('📱 [FCM] Notificación tocada:', notification);
          handleNotificationNavigation(notification.notification.data as FCMNotificationData);
        });
        
        console.log('✅ [FCM] Listeners registrados correctamente');
      }
      
      // Register for push notifications - esto obtiene el token FCM
      console.log('📱 [FCM] ===== LLAMANDO A PushNotifications.register() =====');
      console.log('📱 [FCM] Este es el paso crítico que obtiene el token FCM');
      try {
        await PushNotifications.register();
        registrationCalled.current = true;
        console.log('✅ [FCM] PushNotifications.register() llamado exitosamente');
        console.log('⏳ [FCM] Esperando token FCM en el listener "registration"...');
      } catch (registerError) {
        console.error('❌ [FCM] Error al llamar PushNotifications.register():', registerError);
        registrationCalled.current = false;
        throw registerError;
      }
      
    } catch (err) {
      // No bloquear la app si falla la inicialización
      console.error('❌ [FCM] Error en inicialización:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido en inicialización de FCM';
      console.error('❌ [FCM] Mensaje de error:', errorMessage);
      setError(errorMessage);
      // No lanzar el error para no bloquear la app
    } finally {
      setIsLoading(false);
    }
  }, [userId, registerToken, handleNotificationNavigation, fcmToken]);

  // Remove token on logout
  const removeToken = useCallback(async () => {
    if (!userId || !fcmToken) {
      console.log('📱 FCM: No user or token to remove');
      return;
    }
    
    try {
      console.log('📱 FCM: Removing token for user:', userId);
      
      // Usar variables de entorno en lugar de valores hardcodeados
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PUBLISHABLE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('[FCM] ⚠️ Credenciales de Supabase no configuradas. No se puede remover el token.');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/client_devices?user_id=eq.${userId}&fcm_token=eq.${encodeURIComponent(fcmToken)}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FCM: Error removing token:', errorText);
      } else {
        console.log('✅ FCM: Token removed successfully');
      }
      
      setFcmToken(null);
    } catch (err) {
      console.error('❌ FCM: Error in removeToken:', err);
    }
  }, [userId, fcmToken]);

  // Cleanup listeners on unmount
  const cleanup = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllListeners();
      listenersRegistered.current = false;
      initializationAttempted.current = null; // Reset para permitir reinicialización
      registrationCalled.current = false;
      console.log('📱 [FCM] Listeners removed y flags reseteados');
    } catch (err) {
      console.error('❌ [FCM] Error removing listeners:', err);
    }
  }, []);
  
  // Reset flags when userId changes
  useEffect(() => {
    if (userId && initializationAttempted.current !== userId) {
      console.log('🔄 [FCM] userId cambió, reseteando flags de inicialización');
      registrationCalled.current = false;
    }
  }, [userId]);

  // Initialize FCM when user logs in or app opens
  // This ensures token is registered on login and app open
  useEffect(() => {
    console.log('🔄 [FCM] ===== useEffect: userId cambió =====');
    console.log('📱 [FCM] userId:', userId);
    console.log('📱 [FCM] Es plataforma nativa:', Capacitor.isNativePlatform());
    
    if (userId && Capacitor.isNativePlatform()) {
      console.log('✅ [FCM] Condiciones cumplidas, iniciando FCM...');
      
      let timer: NodeJS.Timeout | null = null;
      
      // Verificar sesión antes de inicializar
      const checkSessionAndInitialize = async () => {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ [FCM] Error al verificar sesión:', sessionError);
            setIsLoading(false);
            return;
          }
          
          if (!session) {
            console.warn('⚠️ [FCM] No hay sesión activa aún, esperando...');
            setIsLoading(false);
            return;
          }
          
          console.log('✅ [FCM] Sesión confirmada, inicializando FCM en 500ms...');
          console.log('📱 [FCM] Session user ID:', session.user.id);
          console.log('📱 [FCM] Session expires at:', new Date(session.expires_at! * 1000).toISOString());
          
          // Pequeño delay para asegurar que la sesión esté completamente establecida
          timer = setTimeout(() => {
            console.log('⏰ [FCM] Timer ejecutado, llamando initializeFCM()...');
            initializeFCM();
          }, 500);
        } catch (err) {
          console.error('❌ [FCM] Error en checkSessionAndInitialize:', err);
          setIsLoading(false);
        }
      };
      
      checkSessionAndInitialize();
      
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    } else {
      console.log('⚠️ [FCM] Condiciones no cumplidas, omitiendo inicialización');
      setIsLoading(false);
    }
  }, [userId, initializeFCM]);
  
  // Re-register token if it changes (FCM tokens can change)
  useEffect(() => {
    if (fcmToken && userId && Capacitor.isNativePlatform()) {
      console.log('🔄 [FCM] ===== Token detectado, verificando registro =====');
      console.log('📱 [FCM] Token:', fcmToken.substring(0, 30) + '...');
      console.log('📱 [FCM] userId:', userId);
      // Re-register token to ensure it's up to date
      registerToken(fcmToken, userId).catch(err => {
        console.error('❌ [FCM] Error al re-registrar token:', err);
        // No bloquear la app
      });
    }
  }, [fcmToken, userId, registerToken]);
  
  // Force initialization when session exists (for silent Google login)
  useEffect(() => {
    const checkSession = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user && session.user.id) {
          const sessionUserId = session.user.id;
          console.log('🔍 [FCM] ===== Verificando sesión silenciosa =====');
          console.log('📱 [FCM] Session user ID:', sessionUserId);
          console.log('📱 [FCM] Hook userId:', userId);
          console.log('📱 [FCM] Ya inicializado para este usuario?', initializationAttempted.current === sessionUserId);
          
          // Si hay sesión pero el hook no se ha ejecutado para este usuario, forzar inicialización
          if (sessionUserId && (!initializationAttempted.current || initializationAttempted.current !== sessionUserId)) {
            console.log('🚀 [FCM] Sesión detectada pero hook no inicializado, forzando inicialización...');
            // Pequeño delay para asegurar que el userId del hook se actualice
            setTimeout(() => {
              if (userId === sessionUserId) {
                console.log('✅ [FCM] userId coincide, ejecutando initializeFCM()...');
                initializeFCM();
              } else {
                console.log('⚠️ [FCM] userId no coincide aún, esperando...');
              }
            }, 1000);
          }
        }
      } catch (err) {
        console.error('❌ [FCM] Error al verificar sesión silenciosa:', err);
      }
    };
    
    // Verificar inmediatamente y luego cada 2 segundos por si hay login silencioso
    checkSession();
    const interval = setInterval(checkSession, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, [userId, initializeFCM]);

  return {
    fcmToken,
    hasPermission,
    isLoading,
    error,
    requestPermission: initializeFCM,
    removeToken,
    cleanup
  };
};
