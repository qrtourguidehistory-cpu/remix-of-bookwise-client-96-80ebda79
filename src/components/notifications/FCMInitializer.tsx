import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFCMNotifications } from '@/hooks/useFCMNotifications';

/**
 * FCMInitializer component that initializes Firebase Cloud Messaging
 * when a user is authenticated. This component should be placed inside
 * the AuthProvider to have access to the user context.
 */
export const FCMInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { fcmToken, hasPermission, isLoading, error, removeToken, cleanup } = useFCMNotifications(user?.id);

  useEffect(() => {
    if (fcmToken) {
      console.log('📱 FCM: Initialized with token');
    }
    if (error) {
      console.warn('📱 FCM: Initialization error:', error);
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
