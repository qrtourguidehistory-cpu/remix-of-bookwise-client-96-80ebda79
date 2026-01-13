import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface FCMNotificationData {
  type?: string;
  appointment_id?: string;
  business_id?: string;
  [key: string]: string | undefined;
}

interface ClientDevice {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: string;
  device_info: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const useFCMNotifications = (userId: string | undefined) => {
  const navigate = useNavigate();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listenersRegistered = useRef(false);
  const initializationAttempted = useRef(false);

  // Register FCM token in database using raw SQL via RPC or direct fetch
  const registerToken = useCallback(async (token: string, currentUserId: string) => {
    const platform = Capacitor.getPlatform();
    
    try {
      console.log('📱 FCM: Registering token for user:', currentUserId);
      
      // Use fetch to call Supabase REST API directly for the custom table
      const supabaseUrl = 'https://rdznelijpliklisnflfm.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkem5lbGlqcGxpa2xpc25mbGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjY4MzAsImV4cCI6MjA3ODIwMjgzMH0.o8G-wYYIN0Paw20YP4dSJcL5mf2mUdrfcWRfMauFjGQ';
      
      // Get the current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabaseUrl}/rest/v1/client_devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          user_id: currentUserId,
          fcm_token: token,
          platform: platform,
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FCM: Error registering token:', errorText);
        throw new Error(errorText);
      }
      
      console.log('✅ FCM: Token registered successfully');
    } catch (err) {
      console.error('❌ FCM: Error in registerToken:', err);
      setError(err instanceof Error ? err.message : 'Failed to register FCM token');
    }
  }, []);

  // Handle navigation when notification is tapped
  const handleNotificationNavigation = useCallback((data: FCMNotificationData) => {
    console.log('📱 FCM: Handling notification navigation:', data);
    
    if (data?.type === 'appointment' && data?.appointment_id) {
      navigate('/appointments');
    } else if (data?.type === 'review' && data?.business_id) {
      navigate(`/business/${data.business_id}`);
    } else if (data?.type === 'early_arrival' && data?.appointment_id) {
      navigate('/appointments');
    } else if (data?.business_id) {
      navigate(`/business/${data.business_id}`);
    } else {
      // Default: go to appointments
      navigate('/appointments');
    }
  }, [navigate]);

  // Initialize FCM
  const initializeFCM = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 FCM: Not a native platform, skipping initialization');
      setIsLoading(false);
      return;
    }

    if (!userId) {
      console.log('📱 FCM: No user ID, skipping initialization');
      setIsLoading(false);
      return;
    }

    if (initializationAttempted.current) {
      console.log('📱 FCM: Already attempted initialization');
      return;
    }

    initializationAttempted.current = true;
    console.log('📱 FCM: Starting initialization...');

    try {
      // Dynamically import to avoid issues on web
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Check current permission status
      let permStatus = await PushNotifications.checkPermissions();
      console.log('📱 FCM: Current permission status:', permStatus.receive);
      
      // Request permission if needed
      if (permStatus.receive === 'prompt') {
        console.log('📱 FCM: Requesting permission...');
        permStatus = await PushNotifications.requestPermissions();
        console.log('📱 FCM: Permission result:', permStatus.receive);
      }
      
      if (permStatus.receive !== 'granted') {
        console.log('📱 FCM: Permission denied');
        setHasPermission(false);
        setIsLoading(false);
        setError('Push notification permission denied');
        return;
      }
      
      setHasPermission(true);
      
      // Register listeners only once
      if (!listenersRegistered.current) {
        listenersRegistered.current = true;
        
        // Token registration listener
        await PushNotifications.addListener('registration', async (token) => {
          console.log('📱 FCM: Token received:', token.value.substring(0, 20) + '...');
          setFcmToken(token.value);
          
          if (userId) {
            await registerToken(token.value, userId);
          }
        });
        
        // Registration error listener
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('❌ FCM: Registration error:', err);
          setError(`FCM registration failed: ${err.error}`);
        });
        
        // Foreground notification listener
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 FCM: Notification received (foreground):', notification);
          // You can show a toast or in-app notification here
        });
        
        // Notification tap listener
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('📱 FCM: Notification tapped:', notification);
          handleNotificationNavigation(notification.notification.data as FCMNotificationData);
        });
      }
      
      // Register for push notifications
      console.log('📱 FCM: Calling register()...');
      await PushNotifications.register();
      console.log('📱 FCM: Register called successfully');
      
    } catch (err) {
      console.error('❌ FCM: Initialization error:', err);
      setError(err instanceof Error ? err.message : 'FCM initialization failed');
    } finally {
      setIsLoading(false);
    }
  }, [userId, registerToken, handleNotificationNavigation]);

  // Remove token on logout
  const removeToken = useCallback(async () => {
    if (!userId || !fcmToken) {
      console.log('📱 FCM: No user or token to remove');
      return;
    }
    
    try {
      console.log('📱 FCM: Removing token for user:', userId);
      
      const supabaseUrl = 'https://rdznelijpliklisnflfm.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkem5lbGlqcGxpa2xpc25mbGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjY4MzAsImV4cCI6MjA3ODIwMjgzMH0.o8G-wYYIN0Paw20YP4dSJcL5mf2mUdrfcWRfMauFjGQ';
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/client_devices?user_id=eq.${userId}&fcm_token=eq.${encodeURIComponent(fcmToken)}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FCM: Error removing token:', errorText);
      } else {
        console.log('✅ FCM: Token removed successfully');
      }
      
      setFcmToken(null);
    } catch (err) {
      console.error('❌ FCM: Error in removeToken:', err);
    }
  }, [userId, fcmToken]);

  // Cleanup listeners on unmount
  const cleanup = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.removeAllListeners();
      listenersRegistered.current = false;
      initializationAttempted.current = false;
      console.log('📱 FCM: Listeners removed');
    } catch (err) {
      console.error('❌ FCM: Error removing listeners:', err);
    }
  }, []);

  // Initialize on mount when user is available
  useEffect(() => {
    if (userId && Capacitor.isNativePlatform()) {
      initializeFCM();
    } else {
      setIsLoading(false);
    }
    
    return () => {
      // Don't cleanup on unmount to preserve registration
    };
  }, [userId, initializeFCM]);

  return {
    fcmToken,
    hasPermission,
    isLoading,
    error,
    requestPermission: initializeFCM,
    removeToken,
    cleanup
  };
};
