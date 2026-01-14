import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFCMNotifications } from '@/hooks/useFCMNotifications';

/**
 * FCMInitializer component that initializes Firebase Cloud Messaging
 * when a user is authenticated. This component should be placed inside
 * the AuthProvider to have access to the user context.
 */
export const FCMInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const { fcmToken, hasPermission, isLoading, error, removeToken, cleanup } = useFCMNotifications(user?.id);

  useEffect(() => {
    console.log('🔔 [FCMInitializer] ===== Componente montado/actualizado =====');
    console.log('📱 [FCMInitializer] user:', user?.id || 'null');
    console.log('📱 [FCMInitializer] session:', session ? 'existe' : 'no existe');
    console.log('📱 [FCMInitializer] fcmToken:', fcmToken ? fcmToken.substring(0, 30) + '...' : 'null');
    console.log('📱 [FCMInitializer] hasPermission:', hasPermission);
    console.log('📱 [FCMInitializer] isLoading:', isLoading);
    console.log('📱 [FCMInitializer] error:', error || 'null');
  }, [user, session, fcmToken, hasPermission, isLoading, error]);

  useEffect(() => {
    if (fcmToken) {
      console.log('✅ [FCMInitializer] Token FCM disponible:', fcmToken.substring(0, 30) + '...');
    }
    if (error) {
      console.warn('⚠️ [FCMInitializer] Error de inicialización:', error);
    }
  }, [fcmToken, error]);

  // Cleanup on unmount (app close)
  useEffect(() => {
    return () => {
      // We don't remove the token on app close, only on logout
      // This allows notifications to be received even when app is closed
    };
  }, []);

  return <>{children}</>;
};

export default FCMInitializer;
