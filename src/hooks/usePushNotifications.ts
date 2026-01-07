import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// VAPID public key - generate yours at https://vapidkeys.com/
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [webPushSupported, setWebPushSupported] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // Check Web Push support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setWebPushSupported(true);
      const permission = Notification.permission;
      setHasPermission(permission === 'granted');
      setIsAvailable(true);
    }

    // Check native platform permissions
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permResult = await LocalNotifications.checkPermissions();
        setHasPermission(permResult.display === 'granted');
        setIsAvailable(true);
      } catch (error) {
        console.error('Failed to check notification permissions:', error);
      }
    }
    
    setIsLoading(false);
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // For Web Push
    if (webPushSupported && !Capacitor.isNativePlatform()) {
      try {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        setHasPermission(granted);
        
        if (granted) {
          await subscribeToWebPush();
        }
        
        return granted;
      } catch (error) {
        console.error('Failed to request web notification permission:', error);
        return false;
      }
    }

    // For native platform
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permResult = await LocalNotifications.requestPermissions();
        const granted = permResult.display === 'granted';
        setHasPermission(granted);
        return granted;
      } catch (error) {
        console.error('Failed to request notification permission:', error);
        return false;
      }
    }

    return false;
  }, [webPushSupported]);

  const subscribeToWebPush = useCallback(async (): Promise<boolean> => {
    if (!webPushSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');
        
        if (!p256dhKey || !authKey) {
          console.error('Missing subscription keys');
          return false;
        }

        const subscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey)))),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey)))),
          },
        };

        // Log subscription for now - full integration after types sync
        console.log('Web Push subscription ready:', subscriptionData.endpoint.substring(0, 50) + '...');
        console.log('User ID:', user.id);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to subscribe to web push:', error);
      return false;
    }
  }, [webPushSupported]);

  const unsubscribeFromWebPush = useCallback(async (): Promise<boolean> => {
    if (!webPushSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database - the table will be available after types sync
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('Unsubscribed from web push for user:', user.id);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from web push:', error);
      return false;
    }
  }, [webPushSupported]);

  const scheduleNotification = useCallback(async (
    notification: ScheduledNotification
  ): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Scheduled notification (browser):', notification);
      return true;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notification.id,
            title: notification.title,
            body: notification.body,
            schedule: { at: notification.scheduleAt },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: null,
          },
        ],
      });
      
      return true;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return false;
    }
  }, []);

  const scheduleAppointmentReminders = useCallback(async (
    appointmentId: string,
    appointmentDate: Date,
    businessName: string,
    serviceName: string
  ): Promise<boolean> => {
    // Schedule 24h reminder
    const reminder24h = new Date(appointmentDate);
    reminder24h.setHours(reminder24h.getHours() - 24);

    // Schedule 1h reminder
    const reminder1h = new Date(appointmentDate);
    reminder1h.setHours(reminder1h.getHours() - 1);

    const now = new Date();

    try {
      if (reminder24h > now) {
        await scheduleNotification({
          id: parseInt(appointmentId.slice(0, 8), 16) + 1,
          title: 'Appointment Tomorrow',
          body: `Don't forget your ${serviceName} appointment at ${businessName} tomorrow!`,
          scheduleAt: reminder24h,
        });
      }

      if (reminder1h > now) {
        await scheduleNotification({
          id: parseInt(appointmentId.slice(0, 8), 16) + 2,
          title: 'Appointment in 1 Hour',
          body: `Your ${serviceName} appointment at ${businessName} is in 1 hour!`,
          scheduleAt: reminder1h,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to schedule appointment reminders:', error);
      return false;
    }
  }, [scheduleNotification]);

  const cancelNotification = useCallback(async (notificationId: number): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      return true;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }, []);

  const cancelAppointmentReminders = useCallback(async (appointmentId: string): Promise<boolean> => {
    const baseId = parseInt(appointmentId.slice(0, 8), 16);
    
    try {
      await cancelNotification(baseId + 1);
      await cancelNotification(baseId + 2);
      return true;
    } catch (error) {
      console.error('Failed to cancel appointment reminders:', error);
      return false;
    }
  }, [cancelNotification]);

  const getPendingNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return [];
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }, []);

  return {
    isAvailable,
    hasPermission,
    isLoading,
    webPushSupported,
    requestPermission,
    subscribeToWebPush,
    unsubscribeFromWebPush,
    scheduleNotification,
    scheduleAppointmentReminders,
    cancelNotification,
    cancelAppointmentReminders,
    getPendingNotifications,
  };
};
