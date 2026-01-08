import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

const GOOGLE_WEB_CLIENT_ID = '762901353486-ag4dldcdshuolrtq3jp5suo071ja86id.apps.googleusercontent.com';

// Singleton para inicialización del plugin
let socialLoginInitPromise: Promise<void> | null = null;
let isInitialized = false;

const initializeSocialLogin = async () => {
  if (isInitialized) return;
  if (socialLoginInitPromise) return socialLoginInitPromise;

  const platform = Capacitor.getPlatform();
  if (platform === 'web') {
    isInitialized = true;
    return;
  }

  socialLoginInitPromise = (async () => {
    try {
      console.log('🔧 useNativeSocialLogin: Inicializando plugin SocialLogin...');
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      
      await SocialLogin.initialize({
        google: {
          webClientId: GOOGLE_WEB_CLIENT_ID,
        },
        apple: {
          clientId: 'app.bookwise.client',
        },
      });
      
      isInitialized = true;
      console.log('✅ useNativeSocialLogin: Plugin SocialLogin inicializado correctamente');
    } catch (error) {
      console.error('❌ useNativeSocialLogin: Error al inicializar SocialLogin:', error);
      socialLoginInitPromise = null;
      throw error;
    }
  })();

  return socialLoginInitPromise;
};

export const useNativeSocialLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Inicializar el plugin al montar el hook
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (platform !== 'web') {
      initializeSocialLogin().catch((err) => {
        setInitError(err instanceof Error ? err : new Error(String(err)));
      });
    }
  }, []);

  const signInWithGoogleNative = async () => {
    const platform = Capacitor.getPlatform();
    const currentIsNative = Capacitor.isNativePlatform() || 
                           platform === 'android' || 
                           platform === 'ios';
    
    console.log('🔵 useNativeSocialLogin.signInWithGoogleNative()');
    console.log('🔵 Platform:', platform, 'isNative:', currentIsNative);

    if (!currentIsNative) {
      console.log('🔵 Fallback a OAuth web');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      return { error: error as Error | null };
    }

    try {
      setIsLoading(true);
      
      // Asegurar inicialización
      await initializeSocialLogin();
      
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      
      console.log('🔵 Llamando SocialLogin.login() con Google...');
      let result;
      try {
        result = await SocialLogin.login({
          provider: 'google',
          options: {
            // No pasar scopes explícitos: el plugin añade email/profile/openid por defecto.
            // Pasar scopes exige modificar MainActivity en Android y puede provocar el error mostrado.
            filterByAuthorizedAccounts: false,
          },
        });
      } catch (loginError) {
        const loginErrMsg = loginError instanceof Error ? loginError.message : String(loginError);
        // Si el plugin rechaza por falta de modificación del MainActivity, reintentar SIN pasar options.scopes
        if (loginErrMsg.includes('You CANNOT use scopes')) {
          console.warn('⚠️ SocialLogin rechazó el uso de scopes; reintentando sin scopes...');
          result = await SocialLogin.login({
            provider: 'google',
            options: {
              filterByAuthorizedAccounts: false,
            },
          });
        } else if (loginErrMsg.includes('[16]') || loginErrMsg.toLowerCase().includes('reauth')) {
          // Si la cuenta requiere reautenticación (ej: '[16] Account reauth failed'), hacer fallback a OAuth web con deep link
          console.warn('⚠️ SocialLogin returned account reauth failed; falling back to web OAuth');
          const redirectTo = 'bookwise://login-callback';
          const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, skipBrowserRedirect: true },
          });
          if (oauthError) {
            console.error('❌ Falló fallback OAuth web:', oauthError);
            throw oauthError;
          }
          if (data?.url) {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: data.url });
            // Result handled via browser redirect
            return { error: null };
          }
          throw new Error('No se pudo generar URL de OAuth web para reintentar');
        } else {
          throw loginError;
        }
      }
      
      console.log('🔵 Resultado de SocialLogin.login():', { 
        hasResult: !!result, 
        resultKeys: result ? Object.keys(result) : [] 
      });
      
      const idToken = (result?.result as { idToken?: string })?.idToken;
      
      if (!idToken) {
        console.error('❌ No se recibió idToken de Google');
        return { 
          error: new Error(
            'No se recibió token de Google. Verifica la configuración del Web Client ID y SHA-1 en Google Cloud Console.'
          ) 
        };
      }

      console.log('🔵 Enviando idToken a Supabase...');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      
      if (error) {
        console.error('❌ Error de Supabase signInWithIdToken:', error);
      } else {
        console.log('✅ Google Sign-In exitoso via useNativeSocialLogin');
      }
      
      return { error: error as Error | null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Google Sign-In error:', errorMsg);
      
      // Mensaje amigable si el plugin rechaza scopes (sincronización/MainActivity)
      if (errorMsg.includes('You CANNOT use scopes')) {
        return {
          error: new Error(
            'El build actual no permite usar scopes en Google Sign-In. Asegúrate de haber modificado `MainActivity` según la documentación del plugin o evita usar scopes.'
          ),
        };
      }

      // Manejar errores específicos
      if (errorMsg.includes('NoCredentialException') || errorMsg.includes('no credentials')) {
        return {
          error: new Error('No se encontraron cuentas de Google. Agrega una cuenta en Configuración del dispositivo.'),
        };
      }
      if (errorMsg.includes('canceled') || errorMsg.includes('cancelled')) {
        return { error: new Error('Inicio de sesión cancelado.') };
      }
      
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithAppleNative = async () => {
    const platform = Capacitor.getPlatform();
    const currentIsNative = Capacitor.isNativePlatform() || 
                           platform === 'android' || 
                           platform === 'ios';
    
    if (!currentIsNative) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      return { error: error as Error | null };
    }

    try {
      setIsLoading(true);
      
      await initializeSocialLogin();
      
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      
      const result = await SocialLogin.login({
        provider: 'apple',
        options: {
          scopes: ['email', 'name'],
        },
      });
      
      const idToken = (result?.result as { idToken?: string })?.idToken;
      if (idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
        });
        return { error: error as Error | null };
      }
      
      return { error: new Error('No ID token received from Apple') };
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signInWithGoogleNative,
    signInWithAppleNative,
    isLoading,
    initError,
  };
};