import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Componente que maneja la redirección automática después del login OAuth
 * Escucha eventos de autenticación y redirige al home cuando se detecta SIGNED_IN
 */
export const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    console.log('🔐 AuthRedirectHandler: Configurando listener de autenticación...');

    // Listener para cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 AuthRedirectHandler: Evento de autenticación:', event);
        console.log('🔐 AuthRedirectHandler: Sesión:', session ? 'existe' : 'no existe');
        console.log('🔐 AuthRedirectHandler: Usuario:', session?.user?.email || 'sin usuario');

        // Solo procesar SIGNED_IN una vez
        if (isProcessing.current) {
          console.log('⚠️ AuthRedirectHandler: Ya se está procesando un evento, saltando...');
          return;
        }

        // Manejar SIGNED_IN específicamente
        if (event === 'SIGNED_IN' && session) {
          isProcessing.current = true;
          console.log('✅ AuthRedirectHandler: SIGNED_IN detectado, preparando redirección...');

          // Verificar que realmente tenemos una sesión válida
          const { data: { session: verifiedSession } } = await supabase.auth.getSession();
          
          if (verifiedSession && verifiedSession.user) {
            console.log('✅ AuthRedirectHandler: Sesión verificada, redirigiendo al home...');
            console.log('✅ AuthRedirectHandler: Usuario:', verifiedSession.user.email);

            // Prevenir múltiples redirecciones
            if (!hasRedirected.current) {
              hasRedirected.current = true;

              // Pequeño delay para asegurar que el estado se actualice
              setTimeout(() => {
                // Solo redirigir si estamos en una página de auth
                const isAuthPage = location.pathname.startsWith('/auth') || 
                                  location.pathname === '/welcome' || 
                                  location.pathname === '/splash';
                
                if (isAuthPage) {
                  console.log('✅ AuthRedirectHandler: Redirigiendo de', location.pathname, 'a /');
                  navigate('/', { replace: true });
                } else {
                  console.log('ℹ️ AuthRedirectHandler: Ya estamos en una página protegida, no redirigiendo');
                }

                // Resetear el flag después de un tiempo
                setTimeout(() => {
                  isProcessing.current = false;
                  hasRedirected.current = false;
                }, 2000);
              }, 500);
            } else {
              console.log('⚠️ AuthRedirectHandler: Ya se redirigió, saltando...');
              isProcessing.current = false;
            }
          } else {
            console.warn('⚠️ AuthRedirectHandler: Sesión no verificada después de SIGNED_IN');
            isProcessing.current = false;
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔐 AuthRedirectHandler: SIGNED_OUT detectado');
          hasRedirected.current = false;
          isProcessing.current = false;
        } else {
          // Para otros eventos, resetear el flag después de un tiempo
          setTimeout(() => {
            isProcessing.current = false;
          }, 1000);
        }
      }
    );

    // Verificar sesión existente al montar
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          console.log('✅ AuthRedirectHandler: Sesión existente detectada al iniciar');
          console.log('✅ AuthRedirectHandler: Usuario:', session.user.email);
          
          // Si hay sesión y estamos en una página de auth, redirigir
          const isAuthPage = location.pathname.startsWith('/auth') || 
                            location.pathname === '/welcome' || 
                            location.pathname === '/splash';
          
          if (isAuthPage && !hasRedirected.current) {
            console.log('✅ AuthRedirectHandler: Redirigiendo desde sesión existente...');
            hasRedirected.current = true;
            setTimeout(() => {
              navigate('/', { replace: true });
              setTimeout(() => {
                hasRedirected.current = false;
              }, 2000);
            }, 300);
          }
        }
      } catch (error) {
        console.error('❌ AuthRedirectHandler: Error al verificar sesión existente:', error);
      }
    };

    checkExistingSession();

    return () => {
      console.log('🔐 AuthRedirectHandler: Limpiando listener...');
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Este componente no renderiza nada
  return null;
};

