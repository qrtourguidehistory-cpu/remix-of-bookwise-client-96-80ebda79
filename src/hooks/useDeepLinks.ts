import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Helper function to process OAuth URLs
// SOLO maneja bookwise://login-callback con tokens
const processOAuthUrl = async (url: string, supabase: any, navigate: any) => {
  console.log('🔄 Procesando URL OAuth:', url);
  
  // SOLO procesar si es bookwise://login-callback
  if (!url.includes('bookwise://login-callback')) {
    console.log('⚠️ URL no es bookwise://login-callback, ignorando');
    return;
  }

  // Manejar el callback OAuth
  await handleOAuthCallback(url, supabase, navigate);
};

// Helper function to handle OAuth callback
// Para Capacitor: usar getSession() después del callback en lugar de setSession()
const handleOAuthCallback = async (
  url: string,
  supabase: any,
  navigate: any
) => {
  console.log('🔐 ===== MANEJANDO CALLBACK OAUTH =====');
  console.log('🔐 URL recibida:', url);
  
  try {
    // Extraer tokens del hash de la URL
    const hashMatch = url.match(/#([^#]+)$/);
    if (!hashMatch) {
      console.error('❌ No se encontró hash en la URL');
      return false;
    }

    const hashParams = new URLSearchParams(hashMatch[1]);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    if (!accessToken || !refreshToken) {
      console.error('❌ No se encontraron tokens en la URL');
      return false;
    }

    console.log('✅ Tokens encontrados:', {
      type,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken
    });

    // Establecer la sesión con los tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      console.error('❌ Error al establecer sesión:', sessionError);
      return false;
    }

    console.log('✅ Sesión establecida con setSession');

    // CRÍTICO: Usar getSession() para recuperar la sesión completa
    // Esto asegura que Supabase tenga la sesión correctamente configurada
    const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error('❌ Error al obtener sesión:', getSessionError);
      return false;
    }

    if (session && session.user) {
      console.log('✅ Sesión recuperada exitosamente con getSession()');
      console.log('✅ Usuario:', session.user.email);
      
      // Mostrar toast de éxito
      try {
        const { toast } = await import('sonner');
        toast.success('¡Sesión iniciada exitosamente!');
      } catch (toastError) {
        console.warn('⚠️ No se pudo mostrar toast:', toastError);
      }

      // El evento SIGNED_IN se disparará automáticamente
      // AuthRedirectHandler se encargará de la redirección
      return true;
    } else {
      console.warn('⚠️ Sesión no encontrada después de getSession()');
      return false;
    }
  } catch (error) {
    console.error('❌ Excepción al manejar callback OAuth:', error);
    return false;
  }
};

export const useDeepLinks = () => {
  const navigate = useNavigate();
  const listenersSetup = useRef(false);

  useEffect(() => {
    // CRITICAL: Always setup listeners, but check platform inside
    if (listenersSetup.current) {
      console.log('⚠️ Listeners ya configurados, saltando...');
      return;
    }

    const setupDeepLinks = async () => {
      try {
        // Check if we're on a native platform
        const platform = Capacitor.getPlatform();
        const isNative = Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios';
        
        console.log('🔧 Configurando deep links...', {
          platform,
          isNativePlatform: Capacitor.isNativePlatform(),
          isNative
        });

        // Only setup Capacitor listeners on native platforms
        if (!isNative) {
          console.log('⚠️ No es plataforma nativa, saltando configuración de deep links');
          return;
        }

        const { App } = await import('@capacitor/app');
        console.log('✅ Plugin @capacitor/app cargado');

        // Handle deep link when app is opened from a link
        const urlListener = await App.addListener('appUrlOpen', async (event) => {
          // CRITICAL DEBUG: Log everything about the received URL
          console.log('🔗 ===== DEEP LINK RECIBIDO (appUrlOpen) =====');
          console.log('🔗 Timestamp:', new Date().toISOString());
          console.log('🔗 URL completa:', event.url);
          console.log('🔗 Tipo de URL:', typeof event.url);
          console.log('🔗 Longitud de URL:', event.url?.length);
          console.log('🔗 Contiene #access_token:', event.url?.includes('#access_token'));
          console.log('🔗 Contiene bookwise://:', event.url?.includes('bookwise://'));
          console.log('🔗 Contiene login-callback:', event.url?.includes('login-callback'));
          console.log('🔗 Contiene oauth:', event.url?.includes('oauth'));
          
          try {
            const url = new URL(event.url);
            console.log('🔗 URL parseada exitosamente:', {
              protocol: url.protocol,
              host: url.host,
              hostname: url.hostname,
              pathname: url.pathname,
              hash: url.hash ? url.hash.substring(0, 50) + '...' : 'sin hash',
              search: url.search
            });
            
            // SOLO manejar bookwise://login-callback
            // NO interceptar URLs de Supabase (https://*.supabase.co)
            if (url.protocol === 'bookwise:' && url.host === 'login-callback') {
              console.log('✅ Callback OAuth detectado: bookwise://login-callback');
              const success = await handleOAuthCallback(event.url, supabase, navigate);
              if (success) {
                return; // Sesión establecida, AuthRedirectHandler manejará la navegación
              }
            }
            
            // Handle regular deep links
            const path = url.pathname;
            if (path) {
              navigate(path, { replace: true });
            }
          } catch (e) {
            console.log('⚠️ Error al parsear URL, intentando manejo alternativo:', e);
            console.log('⚠️ URL que causó el error:', event.url);
            
            // SOLO manejar bookwise://login-callback
            if (event.url.includes('bookwise://login-callback')) {
              console.log('✅ OAuth callback detectado: bookwise://login-callback');
              const success = await handleOAuthCallback(event.url, supabase, navigate);
              if (success) {
                return; // Sesión establecida
              }
            }
            
            const customPath = event.url.replace(/^[^:]+:\/\//, '/');
            if (customPath && customPath !== '/') {
              navigate(customPath, { replace: true });
            }
          }
        });

        // Handle app state changes - CRITICAL for OAuth flow
        const stateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          console.log('📱 ===== APP STATE CHANGED =====');
          console.log('📱 Is active:', isActive);
          console.log('📱 Timestamp:', new Date().toISOString());
          
          // When app becomes active, check if we have a launch URL
          if (isActive) {
            try {
              console.log('📱 App activa - verificando launch URL...');
              const launchUrl = await App.getLaunchUrl();
              
              if (launchUrl?.url) {
                console.log('🚀 ===== URL DE LANZAMIENTO DETECTADA (appStateChange) =====');
                console.log('🚀 URL completa:', launchUrl.url);
                console.log('🚀 Contiene #access_token:', launchUrl.url.includes('#access_token'));
                console.log('🚀 Contiene bookwise://:', launchUrl.url.includes('bookwise://'));
                console.log('🚀 Contiene login-callback:', launchUrl.url.includes('login-callback'));
                
                // Process the URL as if it came from appUrlOpen
                // This handles the case where the browser redirects but the listener misses it
                if (launchUrl.url.includes('bookwise://login-callback')) {
                  console.log('✅ Procesando URL de lanzamiento como OAuth callback');
                  await handleOAuthCallback(launchUrl.url, supabase, navigate);
                }
              } else {
                console.log('ℹ️ No hay launch URL disponible');
              }
            } catch (error) {
              console.error('❌ Error al verificar launch URL:', error);
            }
          } else {
            console.log('📱 App inactiva');
          }
        });

        // Check if app was opened with a URL (e.g., from OAuth redirect)
        // CRITICAL: Esto se ejecuta al iniciar la app, puede capturar el deep link si appUrlOpen no lo hizo
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('🚀 ===== URL DE LANZAMIENTO DETECTADA (al iniciar) =====');
          console.log('🚀 Timestamp:', new Date().toISOString());
          console.log('🚀 URL completa:', launchUrl.url);
          console.log('🚀 Contiene #access_token:', launchUrl.url?.includes('#access_token'));
          console.log('🚀 Contiene bookwise://:', launchUrl.url?.includes('bookwise://'));
          console.log('🚀 Contiene login-callback:', launchUrl.url?.includes('login-callback'));
          
          try {
            const url = new URL(launchUrl.url);
            
            // SOLO manejar bookwise://login-callback
            if (url.protocol === 'bookwise:' && url.host === 'login-callback') {
              console.log('✅ OAuth callback en URL de lanzamiento detectado');
              const success = await handleOAuthCallback(launchUrl.url, supabase, navigate);
              if (success) {
                console.log('✅ Sesión establecida desde launch URL, AuthRedirectHandler redirigirá');
              }
              return;
            }
            
            // Para otras URLs, navegar normalmente
            if (url.pathname) {
              navigate(url.pathname, { replace: true });
            }
          } catch (e) {
            console.log('Error al parsear URL de lanzamiento, intentando manejo alternativo:', e);
            
            // SOLO manejar bookwise://login-callback
            if (launchUrl.url.includes('bookwise://login-callback')) {
              console.log('✅ OAuth callback en URL de lanzamiento (alternativo) detectado');
              const success = await handleOAuthCallback(launchUrl.url, supabase, navigate);
              if (success) {
                console.log('✅ Sesión establecida desde launch URL (alternativo), AuthRedirectHandler redirigirá');
              }
              return;
            }
            
            const customPath = launchUrl.url.replace(/^[^:]+:\/\//, '/');
            if (customPath && customPath !== '/') {
              navigate(customPath, { replace: true });
            }
          }
        }

        listenersSetup.current = true;

        // Return cleanup function for these specific listeners
        return () => {
          urlListener.remove();
          stateListener.remove();
        };
      } catch (error) {
        console.error('Failed to setup deep links:', error);
      }
    };

    setupDeepLinks();
  }, [navigate]);
};
