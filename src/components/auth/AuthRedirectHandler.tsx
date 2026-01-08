import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente que maneja la redirección automática después del login OAuth
 * Usa el contexto de Auth para evitar listeners duplicados
 */
export const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Solo verificar si hay sesión y redirigir si estamos en auth
    if (session && user && !hasRedirected.current) {
      const isAuthPage = location.pathname.startsWith('/auth') || 
                        location.pathname === '/welcome' || 
                        location.pathname === '/splash';
      
      if (isAuthPage) {
        console.log('✅ AuthRedirectHandler: Sesión detectada en página de auth, redirigiendo...');
        hasRedirected.current = true;
        
        // Pequeño delay para evitar race conditions
        setTimeout(() => {
          navigate('/', { replace: true });
          // Reset después de un tiempo
          setTimeout(() => {
            hasRedirected.current = false;
          }, 2000);
        }, 100);
      }
    }
  }, [session, user, location.pathname, navigate]);

  // Este componente no renderiza nada
  return null;
};
