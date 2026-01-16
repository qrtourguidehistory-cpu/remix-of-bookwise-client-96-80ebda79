import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate, TablesInsert } from '@/integrations/supabase/types';
import { initPushNotifications } from '@/utils/pushNotifications';

type ClientProfileRow = Tables<"client_profiles">;

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  avatar_url: string | null;
  accepts_marketing: boolean | null;
  biometric_enabled: boolean | null;
  push_token: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refetchProfile: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_WEB_CLIENT_ID = '762901353486-v2vvtk3oskg0t8rd58la8lums0tb87sa.apps.googleusercontent.com';

let googleSocialLoginInit: Promise<void> | null = null;
const ensureGoogleSocialLoginInitialized = async () => {
  // No-op on web builds
  const platform = Capacitor.getPlatform();
  if (platform === 'web') return;

  if (googleSocialLoginInit) return googleSocialLoginInit;

  googleSocialLoginInit = (async () => {
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    await SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
      },
    });
  })();

  return googleSocialLoginInit;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    console.log('🔐 AuthContext: Configurando listener de autenticación...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthContext: Evento de autenticación:', event);
        console.log('🔐 AuthContext: Sesión:', session ? 'existe' : 'no existe');
        console.log('🔐 AuthContext: Usuario:', session?.user?.email || 'sin usuario');
        
        // Actualizar estado inmediatamente
        setSession(session);
        setUser(session?.user ?? null);
        
        // Manejar diferentes eventos
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ AuthContext: SIGNED_IN detectado, usuario:', session.user.email);
          console.log('✅ AuthContext: User ID:', session.user.id);
          console.log('✅ AuthContext: Platform:', Capacitor.getPlatform());
          console.log('✅ AuthContext: isNativePlatform:', Capacitor.isNativePlatform());
          
          // Inicializar push notifications SOLO después del login
          setTimeout(() => {
            if (Capacitor.isNativePlatform()) {
              console.log('✅ AuthContext: Iniciando push notifications después de SIGNED_IN...');
              initPushNotifications(session.user.id).catch((err) => {
                console.error('❌ AuthContext: Error al inicializar push notifications:', err);
              });
            }
          }, 500);
          
          // El AuthRedirectHandler se encargará de la redirección
        } else if (event === 'SIGNED_OUT') {
          console.log('🔐 AuthContext: SIGNED_OUT detectado');
          setProfile(null);
          setIsGuest(false);
          localStorage.removeItem('guestMode');
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 AuthContext: TOKEN_REFRESHED, usuario:', session.user.email);
        }
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthContext: Error al obtener sesión:', error);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ AuthContext: Sesión existente detectada al iniciar');
          console.log('✅ AuthContext: Usuario:', session.user.email);
          setSession(session);
          setUser(session.user);
          await fetchProfile(session.user.id);
          
          // Inicializar push notifications si hay sesión existente
          setTimeout(() => {
            if (Capacitor.isNativePlatform()) {
              console.log('✅ AuthContext: Iniciando push notifications para sesión existente...');
              initPushNotifications(session.user.id).catch((err) => {
                console.error('❌ AuthContext: Error al inicializar push notifications:', err);
              });
            }
          }, 1000);
        } else {
          console.log('ℹ️ AuthContext: No hay sesión existente');
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ AuthContext: Excepción al inicializar sesión:', error);
        setIsLoading(false);
      }
    };

    initializeSession();

    // Check if user previously continued as guest
    const guestMode = localStorage.getItem('guestMode');
    if (guestMode === 'true') {
      setIsGuest(true);
    }

    return () => {
      console.log('🔐 AuthContext: Limpiando listener...');
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    // Use client_profiles table for client app users
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const profileData = data as ClientProfileRow;
      setProfile({
        id: profileData.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone,
        country_code: profileData.country_code,
        avatar_url: profileData.avatar_url,
        accepts_marketing: profileData.accepts_marketing,
        biometric_enabled: profileData.biometric_enabled,
        push_token: profileData.push_token,
      });
    } else if (error?.code === 'PGRST116') {
      // Profile doesn't exist, create it automatically
      console.log('Client profile not found, creating it...');
      const { error: createError } = await supabase
        .from('client_profiles')
        .insert({
          id: userId,
          email: user?.email || null,
        });
      
      if (!createError) {
        // Retry fetching the profile
        await fetchProfile(userId);
      } else {
        console.error('Error creating client profile:', createError);
      }
    }
  };

  const refetchProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios';

      console.log('🔵 ===== GOOGLE SIGN-IN INICIANDO =====');
      console.log('🔵 Platform:', platform);
      console.log('🔵 isNativePlatform():', Capacitor.isNativePlatform());
      console.log('🔵 isNative (calculado):', isNative);
      console.log('🔵 User Agent:', navigator.userAgent);

      if (!isNative) {
        // WEB: Use standard OAuth flow
        console.log('🔵 Using WEB OAuth flow for Google Sign-In');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
          },
        });
        return { error: error as Error | null };
      }

      // NATIVE: Use @capgo/capacitor-social-login for native Google Sign-In
      console.log('🔵 Using NATIVE Google Sign-In via capacitor-social-login');
      console.log('🔵 Web Client ID:', GOOGLE_WEB_CLIENT_ID);

      try {
        console.log('🔵 Step 1: Inicializando plugin SocialLogin...');
        await ensureGoogleSocialLoginInitialized();
        console.log('🔵 Step 1: ✅ Plugin inicializado correctamente');
      } catch (initError) {
        console.error('❌ Error al inicializar SocialLogin:', initError);
        return {
          error: new Error(
            `Error al inicializar Google Sign-In: ${initError instanceof Error ? initError.message : String(initError)}`
          ),
        };
      }

      const { SocialLogin } = await import('@capgo/capacitor-social-login');

      console.log('🔵 Step 2: Llamando SocialLogin.login()...');
      let result;
      try {
        result = await SocialLogin.login({
          provider: 'google',
          options: {
            // No se pasan scopes explícitos: el plugin añadirá por defecto email/profile/openid.
            // filterByAuthorizedAccounts: false evita NoCredentialException en algunos dispositivos
            filterByAuthorizedAccounts: false,
          },
        });
        console.log('🔵 Step 2: ✅ SocialLogin.login() completado');
        console.log('🔵 Result type:', typeof result);
        console.log('🔵 Result keys:', result ? Object.keys(result) : 'null');
      } catch (loginError) {
        const errorMsg = loginError instanceof Error ? loginError.message : String(loginError);
        console.error('❌ SocialLogin.login() error:', errorMsg);
        
        // Si el plugin rechazó el uso de scopes por falta de modificación de MainActivity, reintentar sin scopes
        if (errorMsg.includes('You CANNOT use scopes')) {
          console.warn('⚠️ SocialLogin rechazó el uso de scopes; reintentando sin scopes...');
          try {
            result = await SocialLogin.login({
              provider: 'google',
              options: {
                filterByAuthorizedAccounts: false,
              },
            });
            console.log('🔵 Step 2: ✅ Reintento SocialLogin.login() sin scopes completado');
            console.log('🔵 Result keys:', result ? Object.keys(result) : 'null');
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            console.error('❌ Reintento sin scopes falló:', retryMsg);
            if (retryMsg.includes('You CANNOT use scopes')) {
              return {
                error: new Error(
                  'El build actual no permite usar scopes en Google Sign-In. Asegúrate de haber modificado `MainActivity` según la documentación del plugin o evita usar scopes.'
                ),
              };
            }
            return { error: retryErr as Error };
          }
        }
        
        // Errores específicos de Google Credential Manager
        // Manejo: Cuenta requiere reautenticación (ApiException code 16) — fallback a OAuth web con deep link
        if (errorMsg.includes('[16]') || errorMsg.toLowerCase().includes('reauth')) {
          console.warn('⚠️ Google native sign-in requires reauthentication; falling back to web OAuth (deep link)');
          try {
            const redirectTo = 'bookwise://login-callback';
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo, skipBrowserRedirect: true },
            });
            if (oauthError) {
              console.error('❌ Falló fallback OAuth web:', oauthError);
              return { error: oauthError as Error };
            }
            if (data?.url) {
              const { Browser } = await import('@capacitor/browser');
              await Browser.open({ url: data.url });
              return { error: null };
            }
            return { error: new Error('No se pudo generar URL de OAuth web para reintentar') };
          } catch (fallbackErr) {
            console.error('❌ Fallback a OAuth web falló:', fallbackErr);
            return { error: fallbackErr as Error };
          }
        }

        if (errorMsg.includes('NoCredentialException') || errorMsg.includes('no credentials')) {
          return {
            error: new Error(
              'No se encontraron cuentas de Google en el dispositivo. Por favor, agrega una cuenta de Google en Configuración.'
            ),
          };
        }
        if (errorMsg.includes('canceled') || errorMsg.includes('cancelled')) {
          return {
            error: new Error('Inicio de sesión cancelado por el usuario.'),
          };
        }
        
        return { error: loginError as Error };
      }

      const idToken = ((result?.result as { idToken?: string | null })?.idToken ?? null) || null;
      console.log('🔵 Step 3: Extrayendo idToken...');
      console.log('🔵 Has idToken:', !!idToken);
      console.log('🔵 idToken length:', idToken?.length || 0);

      if (!idToken) {
        console.error('❌ No se recibió idToken de Google');
        console.error('❌ Result completo:', JSON.stringify(result, null, 2));
        return {
          error: new Error(
            'Google no devolvió idToken. Verifica:\n1. Web Client ID correcto en Google Cloud Console\n2. SHA-1 del keystore registrado en Google Cloud Console\n3. Package name: com.bookwise.client'
          ),
        };
      }

      console.log('🔵 Step 4: Llamando supabase.auth.signInWithIdToken()...');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.error('❌ Supabase signInWithIdToken error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        return { error: error as Error };
      }

      console.log('✅ ===== GOOGLE SIGN-IN EXITOSO =====');
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('❌ Google Sign-In error general:', message);
      console.error('❌ Stack:', err instanceof Error ? err.stack : 'N/A');

      if (/not implemented|plugin/i.test(message)) {
        return {
          error: new Error(
            'Google Sign-In nativo no está disponible. Ejecuta:\n1. npm run build\n2. npx cap sync android\n3. Rebuild en Android Studio'
          ),
        };
      }

      return { error: err as Error };
    }
  };

  const signInWithApple = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      
      // CRITICAL: Multiple ways to detect Android/iOS (same as Google)
      const platform = Capacitor.getPlatform();
      const isNativePlatform = Capacitor.isNativePlatform();
      
      // Check window.location to detect Android WebView
      const windowLocation = typeof window !== 'undefined' ? window.location : null;
      const isCapacitorProtocol = windowLocation?.protocol === 'capacitor:' || 
                                   windowLocation?.protocol === 'https:' && windowLocation?.hostname === 'localhost';
      const isAndroidHostname = windowLocation?.hostname === 'localhost' && 
                                windowLocation?.port === '' && 
                                windowLocation?.protocol === 'https:';
      
      // User agent check as fallback
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isAndroidUA = /Android/i.test(userAgent);
      const isIOSUA = /iPhone|iPad|iPod/i.test(userAgent);
      
      // FORCE detection: Multiple checks to ensure we catch Android/iOS
      const isDefinitelyNative = platform === 'android' || 
                                 platform === 'ios' || 
                                 isNativePlatform ||
                                 isCapacitorProtocol ||
                                 isAndroidHostname ||
                                 (isAndroidUA && !windowLocation?.hostname.includes('.')) ||
                                 isIOSUA;
      
      // FORMA CORRECTA EN CAPACITOR: Usar deep link explícito
      const redirectTo = isDefinitelyNative 
        ? 'bookwise://login-callback' 
        : `${windowLocation?.origin || 'http://localhost:3000'}/`;
      
      console.log('🍎 ===== INICIANDO APPLE OAUTH CON SUPABASE (FORMA CORRECTA) =====');
      console.log('🍎 Configuración:');
      console.log('  - redirectTo:', redirectTo);
      console.log('  - isDefinitelyNative:', isDefinitelyNative);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { 
          redirectTo: redirectTo, // Deep link explícito para mobile
          skipBrowserRedirect: true, // Interceptar la URL para abrirla manualmente
        },
      });
      
      console.log('📥 Respuesta de Supabase signInWithOAuth (Apple):', {
        hasData: !!data,
        hasError: !!error,
        dataUrl: data?.url,
        errorMessage: error?.message
      });
      
      if (error) {
        console.error('❌ Supabase OAuth Error (Apple):', error);
        console.error('❌ Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
      } else if (data?.url) {
        // CRITICAL: ALWAYS intercept and verify/fix the URL for mobile (same as Google)
        try {
          const urlObj = new URL(data.url);
          const redirectUri = urlObj.searchParams.get('redirect_uri');
          
          console.log('🔍 redirect_uri en URL de Supabase (Apple):', redirectUri);
          console.log('🔍 URL completa de Supabase (Apple):', data.url.substring(0, 200) + '...');
          
          // Verificar el redirect_uri (solo para logging)
          if (redirectUri && redirectUri.includes('bookwise://login-callback')) {
            console.log('✅ CORRECTO: Supabase está usando bookwise://login-callback');
            console.log('✅ redirect_uri:', redirectUri);
          } else {
            console.log('🔍 redirect_uri en URL de Supabase (Apple):', redirectUri);
          }
        } catch (e) {
          console.error('❌ Error al parsear URL de Supabase (Apple):', e);
          console.error('❌ URL que causó el error:', data.url);
        }
        
        // Abrir la URL de Apple OAuth
        if (data?.url) {
          console.log('✅ OAuth iniciado correctamente (Apple)');
          console.log('✅ URL generada por Supabase:', data?.url?.substring(0, 200));
          console.log('✅ redirectTo usado:', redirectTo);
          
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: data.url });
            console.log('✅ URL de Apple OAuth abierta con Capacitor Browser');
            return { error: null };
          } catch (browserError) {
            console.error('❌ Error al abrir Browser:', browserError);
            // Fallback
            if (typeof window !== 'undefined' && window.open) {
              window.open(data.url, '_blank');
              console.log('✅ URL abierta con window.open');
            } else {
              window.location.href = data.url;
              console.log('✅ URL abierta con window.location.href');
            }
            return { error: null };
          }
        }
      }
      
      return { error: error as Error | null };
    } catch (error) {
      console.error('❌ Apple Sign-In error:', error);
      return { error: error as Error };
    }
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error: error as Error | null };
  };

  const verifyOTP = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { error: error as Error | null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string, 
    password: string, 
    metadata?: { first_name?: string; last_name?: string }
  ) => {
    // Check if email already exists in Partner app (profiles table - business owners)
    const { data: existingPartnerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', email) // Check by looking for profile with this email
      .maybeSingle();

    // Also check business_owners table
    const { data: existingBusinessOwner } = await supabase
      .from('business_owners')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingPartnerProfile || existingBusinessOwner) {
      return { 
        error: new Error('Este correo ya está registrado en Bookwise Partner. Por favor, usa otro correo o inicia sesión en la app de Partner.') 
      };
    }

    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsGuest(false);
    localStorage.removeItem('guestMode');
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('guestMode', 'true');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const dbUpdates: TablesUpdate<"client_profiles"> = {};
    if (updates.first_name !== undefined) dbUpdates.first_name = updates.first_name;
    if (updates.last_name !== undefined) dbUpdates.last_name = updates.last_name;
    if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.country_code !== undefined) dbUpdates.country_code = updates.country_code;
    if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
    if (updates.accepts_marketing !== undefined) dbUpdates.accepts_marketing = updates.accepts_marketing;
    if (updates.biometric_enabled !== undefined) dbUpdates.biometric_enabled = updates.biometric_enabled;
    if (updates.push_token !== undefined) dbUpdates.push_token = updates.push_token;

    // Use upsert to handle both insert and update in a single operation
    // This prevents duplicate key errors and race conditions
    const profileData: TablesInsert<"client_profiles"> = {
      id: user.id,
      email: user.email || updates.email || null,
      ...dbUpdates,
    };

    const { error } = await supabase
      .from('client_profiles')
      .upsert(profileData, {
        onConflict: 'id',
      });

    // Note: Email in client_profiles is stored as additional info.
    // To change the auth email (for login), use supabase.auth.updateUser()
    // which requires email verification. We keep client_profiles.email
    // as a separate field for contact information.

    if (!error) {
      // Refetch profile from database to ensure we have the latest data
      await fetchProfile(user.id);
    }

    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isGuest,
        signInWithGoogle,
        signInWithApple,
        signInWithPhone,
        verifyOTP,
        signInWithEmail,
        signUp,
        signOut,
        continueAsGuest,
        updateProfile,
        refetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
