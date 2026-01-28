import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para manejar OAuth con Supabase usando Capacitor Browser
 * Igual que Mi Turnow Partner - solo OAuth web, sin Google Sign-In nativo
 */
export const useCapacitorOAuth = () => {
  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    try {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform() || platform === 'android' || platform === 'ios';

      // Deep link EXACTO para callbacks OAuth (igual que Partner)
      const redirectTo = isNative
        ? 'com.miturnow.cliente://auth/callback'
        : `${window.location.origin}/`;

      console.log(`🔐 Iniciando OAuth con ${provider}...`);
      console.log(`🔐 Platform: ${platform}, isNative: ${isNative}`);
      console.log(`🔐 redirectTo: ${redirectTo}`);

      // Obtener URL de OAuth de Supabase (CRÍTICO: skipBrowserRedirect: true OBLIGATORIO)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true, // OBLIGATORIO: Supabase NO debe abrir navegador automáticamente
        },
      });

      if (error) {
        console.error(`❌ Error al iniciar OAuth con ${provider}:`, error);
        return { error: error as Error };
      }

      if (!data?.url) {
        console.error(`❌ No se recibió URL de OAuth para ${provider}`);
        return { error: new Error(`No se pudo generar URL de OAuth para ${provider}`) };
      }

      console.log(`✅ URL de OAuth generada para ${provider}`);
      console.log(`✅ URL completa: ${data.url}`);
      
      // AUDITORÍA: Verificar redirect_uri en la URL generada
      try {
        const urlObj = new URL(data.url);
        const redirectUri = urlObj.searchParams.get('redirect_uri');
        console.log(`🔍 AUDITORÍA OAuth:`);
        console.log(`  - redirectTo enviado a Supabase: ${redirectTo}`);
        console.log(`  - redirect_uri en URL de OAuth: ${redirectUri}`);
        
        if (redirectUri && !redirectUri.includes('com.miturnow.cliente://auth/callback')) {
          console.error(`❌ PROBLEMA DETECTADO: redirect_uri NO es el deep link esperado!`);
          console.error(`  - Esperado: com.miturnow.cliente://auth/callback`);
          console.error(`  - Recibido: ${redirectUri}`);
          console.error(`  - Esto causará que Supabase redirija al dominio web en lugar de la app`);
        } else if (redirectUri && redirectUri.includes('com.miturnow.cliente://auth/callback')) {
          console.log(`✅ redirect_uri es correcto: ${redirectUri}`);
        } else {
          console.warn(`⚠️ No se encontró redirect_uri en la URL de OAuth`);
        }
      } catch (e) {
        console.error(`❌ Error al parsear URL de OAuth:`, e);
      }

      // Abrir URL en navegador SOLO con Browser.open() (en móvil)
      if (isNative) {
        const { Browser } = await import('@capacitor/browser');
        
        // Agregar listener para cuando el navegador se cierre (para debugging)
        Browser.addListener('browserFinished', () => {
          console.log('🔍 Browser cerrado - verificando si deep link fue capturado...');
        });
        
        await Browser.open({ url: data.url });
        console.log(`✅ Navegador abierto para ${provider} OAuth`);
        console.log(`🔍 Esperando callback en: com.miturnow.cliente://auth/callback`);
      } else {
        // Web: redirigir directamente
        window.location.href = data.url;
      }

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error general en OAuth con ${provider}:`, message);
      return { error: err as Error };
    }
  };

  return {
    signInWithOAuth,
  };
};

