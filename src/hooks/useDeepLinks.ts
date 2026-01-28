import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Helper function to handle OAuth callback
const handleOAuthCallback = async (
  url: string,
  supabase: any,
  navigate: any
) => {
  console.log('🔐 ===== MANEJANDO CALLBACK OAUTH =====');
  console.log('🔐 URL recibida:', url);
  
  try {
    console.log('🔐 Procesando callback URL:', url);
    
    // Intentar extraer tokens del hash primero (método estándar de Supabase)
    let hashParams: URLSearchParams | null = null;
    const hashMatch = url.match(/#([^#]+)$/);
    if (hashMatch) {
      hashParams = new URLSearchParams(hashMatch[1]);
      console.log('✅ Hash encontrado en URL');
    } else {
      // Si no hay hash, intentar query parameters (algunos callbacks vienen así)
      try {
        const urlObj = new URL(url);
        if (urlObj.search) {
          hashParams = new URLSearchParams(urlObj.search);
          console.log('✅ Query parameters encontrados en URL');
        }
      } catch (e) {
        console.warn('⚠️ No se pudo parsear como URL, intentando extracción manual');
      }
    }

    if (!hashParams) {
      console.error('❌ No se encontró hash ni query parameters en la URL');
      console.error('❌ URL completa:', url);
      return false;
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    const errorParam = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    // Verificar si hay errores de OAuth
    if (errorParam) {
      console.error('❌ Error en callback OAuth:', errorParam);
      console.error('❌ Descripción:', errorDescription || 'Sin descripción');
      return false;
    }

    if (!accessToken || !refreshToken) {
      console.error('❌ No se encontraron tokens en la URL');
      console.error('❌ Parámetros encontrados:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type,
        allParams: Array.from(hashParams.entries())
      });
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
        const { toast } = await import('@/components/ui/sonner');
        toast.success('¡Sesión iniciada exitosamente!', { id: 'deeplink-session-success' });
      } catch (toastError) {
        console.warn('⚠️ No se pudo mostrar toast:', toastError);
      }

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
  const listenersRef = useRef<{ url: any; state: any } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (listenersSetup.current) {
      console.log('⚠️ Listeners ya configurados, saltando...');
      return;
    }

    const setupDeepLinks = async () => {
      try {
        const platform = Capacitor.getPlatform();
        const isNative = Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios';
        
        console.log('🔧 Configurando deep links...', { platform, isNative });

        if (!isNative) {
          console.log('⚠️ No es plataforma nativa, saltando configuración de deep links');
          return;
        }

        if (!mountedRef.current) return;

        const { App } = await import('@capacitor/app');
        console.log('✅ Plugin @capacitor/app cargado');

        // Handle deep link when app is opened from a link
        const urlListener = await App.addListener('appUrlOpen', async (event) => {
          if (!mountedRef.current) return;
          
          console.log('🔗 DEEP LINK RECIBIDO:', event.url);
          
          // Detectar callback OAuth por contenido de URL (igual que Partner)
          if (event.url.includes('/auth/callback')) {
            console.log('✅ Callback OAuth detectado:', event.url);
            await handleOAuthCallback(event.url, supabase, navigate);
            return;
          }
          
          try {
            const url = new URL(event.url);
            const path = url.pathname;
            if (path && mountedRef.current) {
              navigate(path, { replace: true });
            }
          } catch (e) {
            console.log('⚠️ Error al parsear URL:', e);
            const customPath = event.url.replace(/^[^:]+:\/\//, '/');
            if (customPath && customPath !== '/' && mountedRef.current) {
              navigate(customPath, { replace: true });
            }
          }
        });

        // Handle app state changes
        const stateListener = await App.addListener('appStateChange', async ({ isActive }) => {
          if (!mountedRef.current) return;
          
          console.log('📱 App state changed, isActive:', isActive);
          
          if (isActive) {
            try {
              const launchUrl = await App.getLaunchUrl();
              
              if (launchUrl?.url && launchUrl.url.includes('/auth/callback')) {
                console.log('🚀 URL de lanzamiento OAuth detectada:', launchUrl.url);
                await handleOAuthCallback(launchUrl.url, supabase, navigate);
              }
            } catch (error) {
              console.error('❌ Error al verificar launch URL:', error);
            }
          }
        });

        if (!mountedRef.current) {
          urlListener.remove();
          stateListener.remove();
          return;
        }

        listenersRef.current = { url: urlListener, state: stateListener };

        // Check initial launch URL
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url && mountedRef.current) {
          console.log('🚀 URL de lanzamiento inicial:', launchUrl.url);
          
          if (launchUrl.url.includes('/auth/callback')) {
            console.log('🚀 URL de lanzamiento OAuth detectada (inicial):', launchUrl.url);
            await handleOAuthCallback(launchUrl.url, supabase, navigate);
            return;
          }
          
          try {
            const url = new URL(launchUrl.url);
            if (url.pathname && mountedRef.current) {
              navigate(url.pathname, { replace: true });
            }
          } catch (e) {
            const customPath = launchUrl.url.replace(/^[^:]+:\/\//, '/');
            if (customPath && customPath !== '/' && mountedRef.current) {
              navigate(customPath, { replace: true });
            }
          }
        }

        listenersSetup.current = true;
      } catch (error) {
        console.error('Failed to setup deep links:', error);
      }
    };

    setupDeepLinks();

    return () => {
      mountedRef.current = false;
      if (listenersRef.current) {
        listenersRef.current.url?.remove();
        listenersRef.current.state?.remove();
        listenersRef.current = null;
      }
      listenersSetup.current = false;
    };
  }, [navigate]);
};
