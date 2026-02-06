import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate, TablesInsert } from '@/integrations/supabase/types';
// DEPRECATED: initPushNotifications removido - usar FCMInitializer con useFCMNotifications
import { useCapacitorOAuth } from '@/hooks/useCapacitorOAuth';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  
  // Hook para OAuth con Supabase (igual que Partner)
  const { signInWithOAuth } = useCapacitorOAuth();

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
          
          // Push notifications manejado por FCMInitializer con useFCMNotifications
          // No inicializar aquí para evitar duplicados
          
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
          
          // Push notifications manejado por FCMInitializer con useFCMNotifications
          // No inicializar aquí para evitar duplicados
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
    // Usar OAuth de Supabase exclusivamente (igual que Partner)
    return await signInWithOAuth('google');
  };

  const signInWithApple = async () => {
    // Usar OAuth de Supabase exclusivamente (igual que Partner)
    return await signInWithOAuth('apple');
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
    // Antes de cerrar sesión, desactivar todos los tokens del usuario actual
    if (user?.id) {
      try {
        console.log('🔐 [AuthContext] Desactivando tokens de notificaciones antes de cerrar sesión...');
        
        // Buscar todos los registros en client_devices para este usuario y desactivarlos
        const { error: updateError } = await supabase
          .from('client_devices')
          .update({ is_active: false })
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('❌ [AuthContext] Error al desactivar tokens:', updateError);
          // No bloquear el logout si falla la actualización
        } else {
          console.log('✅ [AuthContext] Tokens desactivados exitosamente');
        }
      } catch (err) {
        console.error('❌ [AuthContext] Excepción al desactivar tokens:', err);
        // No bloquear el logout si falla la actualización
      }
    }
    
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
