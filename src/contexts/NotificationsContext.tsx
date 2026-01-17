import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export type NotificationType = "appointment" | "promotion" | "review" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string; // Relative time like "hace 2 horas"
  read: boolean;
  appointment_id?: string | null;
  send_at: string;
  meta?: any;
}

// Use client_notifications table (with any structure - we'll handle it flexibly)
type ClientNotificationRow = {
  id: string;
  user_id: string;
  appointment_id?: string | null;
  request_id?: string | null;
  business_id?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  meta?: any;
  action_url?: string | null;
  created_at: string;
  updated_at?: string | null;
};

// Transform client_notifications to our Notification format
function transformNotification(
  row: ClientNotificationRow,
  isRead: boolean = false
): Notification {
  const meta = row.meta as any;
  
  // Determine notification type from row.type or meta.type
  let type: NotificationType = "appointment";
  const notificationType = row.type || meta?.type;
  
  if (notificationType) {
    if (notificationType === "review_request" || notificationType === "review") {
      type = "review";
    } else if (notificationType === "confirmation" || notificationType === "completion" || notificationType === "cancellation" || notificationType === "appointment") {
      type = "appointment";
    } else if (notificationType === "early_arrival" || notificationType === "early_arrival_request") {
      type = "appointment";
    } else {
      const validTypes: NotificationType[] = ["appointment", "promotion", "review", "system"];
      type = validTypes.includes(notificationType as NotificationType) ? (notificationType as NotificationType) : "system";
    }
  } else if (row.appointment_id) {
    type = "appointment";
  } else {
    type = "system";
  }

  // Get title and message - prefer row values, fallback to meta
  const title = row.title || meta?.title || "Nueva notificación";
  const message = row.message || meta?.message || "Tienes una nueva notificación";
  
  // Format relative time - use created_at if send_at doesn't exist
  const sendDate = new Date(row.created_at);
  const time = formatDistanceToNow(sendDate, { 
    addSuffix: true, 
    locale: es 
  });

  return {
    id: row.id,
    type,
    title,
    message,
    time,
    read: isRead || row.read,
    appointment_id: row.appointment_id,
    send_at: row.created_at, // Use created_at as send_at
    meta: {
      ...meta,
      type: row.type, // Include row.type in meta for compatibility
      request_id: row.request_id,
      business_id: row.business_id,
      action_url: row.action_url,
    },
  };
}

interface NotificationsContextType {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refetch: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const readNotificationIdsRef = useRef<Set<string>>(new Set());
  const fetchInProgressRef = useRef(false);
  const channelRef = useRef<any>(null);

  // Load read notification IDs from localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`notifications_read_${user.id}`);
      if (saved) {
        try {
          const ids: string[] = JSON.parse(saved);
          const idsSet = new Set<string>(ids);
          setReadNotificationIds(idsSet);
          readNotificationIdsRef.current = idsSet;
        } catch (e) {
          console.error("Error loading read notifications:", e);
        }
      }
    }
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log("🔔 [NotificationsContext] Fetch already in progress, skipping");
      return;
    }

    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      fetchInProgressRef.current = true;
      setLoading(true);
      setError(null);

      console.log("🔔 [NotificationsContext] Fetching client notifications for user:", {
        userId: user.id
      });
      
      // Fetch notifications directly from client_notifications table
      const { data: notificationsData, error: notificationsError } = await supabase
        .from("client_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      console.log("🔔 [NotificationsContext] Raw notifications from DB:", {
        count: notificationsData?.length || 0,
        notifications: (notificationsData || []).map(n => ({
          id: n.id,
          user_id: n.user_id,
          appointment_id: n.appointment_id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          created_at: n.created_at
        }))
      });

      if (notificationsError) {
        console.error("🔔 [NotificationsContext] Error fetching notifications:", notificationsError);
        throw notificationsError;
      }

      // All notifications from client_notifications are for the client
      const clientNotifications = notificationsData || [];

      // Log early arrival notifications specifically
      const earlyArrivalNotifications = clientNotifications.filter((n) => {
        return n.type === 'early_arrival' || n.type === 'early_arrival_request' ||
               (n.meta as any)?.type === 'early_arrival' || (n.meta as any)?.type === 'early_arrival_request';
      });
      
      if (earlyArrivalNotifications.length > 0) {
        console.log("🔔 [NotificationsContext] Found early arrival notifications:", {
          count: earlyArrivalNotifications.length,
          notifications: earlyArrivalNotifications.map(n => ({
            id: n.id,
            appointment_id: n.appointment_id,
            type: n.type,
            title: n.title,
            read: n.read,
            created_at: n.created_at
          }))
        });
      }

      // Get current readNotificationIds from ref (always up-to-date)
      const currentReadIds = readNotificationIdsRef.current;
      
      // Transform notifications and mark as read if in localStorage
      const transformed = clientNotifications.map((n) =>
        transformNotification(n, currentReadIds.has(n.id))
      );

      console.log("🔔 [NotificationsContext] Fetched and transformed notifications:", {
        totalFromDB: notificationsData?.length || 0,
        transformed: transformed.length,
        unreadCount: transformed.filter(n => !n.read).length,
        earlyArrivalCount: transformed.filter(n => 
          n.type === 'appointment' && (
            n.meta?.type === 'early_arrival' || 
            n.meta?.type === 'early_arrival_request'
          )
        ).length,
        allTypes: transformed.map(n => n.type)
      });

      setNotifications(transformed);
    } catch (err: any) {
      setError(err.message);
      console.error("🔔 [NotificationsContext] Error fetching notifications:", err);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [user?.id, profile?.email]); // Removed readNotificationIds from dependencies to avoid infinite loops

  // Fetch notifications when user changes or component mounts
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Always fetch on mount or user change
    fetchNotifications();

    // Set up realtime subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`client-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown> | null;
          const oldRecord = payload.old as Record<string, unknown> | null;
          console.log("🔔 [NotificationsContext] Realtime event received:", {
            event: payload.eventType,
            notification_id: newRecord?.id || oldRecord?.id,
            user_id: newRecord?.user_id || oldRecord?.user_id
          });
          // Refetch notifications when any change occurs
          fetchNotifications();
        }
      )
      .subscribe((status) => {
        console.log("🔔 [NotificationsContext] Realtime subscription status:", status);
        // When subscription is ready, immediately fetch to get any missed notifications
        if (status === 'SUBSCRIBED') {
          console.log("🔔 [NotificationsContext] Subscription ready, fetching notifications");
          fetchNotifications();
        }
      });

    channelRef.current = channel;

    // Debounce focus/visibility handlers to prevent excessive fetches
    let focusDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const DEBOUNCE_MS = 2000; // 2 seconds minimum between fetches
    
    const handleFocus = () => {
      if (focusDebounceTimer) return;
      console.log("🔔 [NotificationsContext] Window focused, refetching notifications");
      focusDebounceTimer = setTimeout(() => {
        fetchNotifications();
        focusDebounceTimer = null;
      }, 500);
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (focusDebounceTimer) return;
        console.log("🔔 [NotificationsContext] Page became visible, refetching notifications");
        focusDebounceTimer = setTimeout(() => {
          fetchNotifications();
          focusDebounceTimer = null;
        }, 500);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Reduce polling frequency since we have realtime - only as backup
    const intervalId = setInterval(() => {
      console.log("🔔 [NotificationsContext] Periodic refetch (backup)");
      fetchNotifications();
    }, 120000); // 2 minutes (reduced from 30 seconds)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      if (focusDebounceTimer) {
        clearTimeout(focusDebounceTimer);
      }
    };
  }, [user?.id, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    // Update in database - marcar como leída y establecer fecha de lectura
    try {
      const { error } = await supabase
        .from("client_notifications")
        .update({ 
          read: true,
          updated_at: new Date().toISOString() // Guardar cuándo se marcó como leída
        })
        .eq("id", id)
        .eq("user_id", user?.id);
      
      if (error) {
        console.error("🔔 [NotificationsContext] Error marking notification as read:", error);
        // Continue anyway to update local state
      }
    } catch (error) {
      console.error("🔔 [NotificationsContext] Error marking notification as read:", error);
    }
    
    // Update local state
    setReadNotificationIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      readNotificationIdsRef.current = newSet; // Update ref
      
      if (user?.id) {
        localStorage.setItem(
          `notifications_read_${user.id}`,
          JSON.stringify(Array.from(newSet))
        );
      }
      
      return newSet;
    });

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    const allIds = notifications.map((n) => n.id);
    
    // Update in database
    if (allIds.length > 0 && user?.id) {
      try {
        const { error } = await supabase
          .from("client_notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .in("id", allIds);
        
        if (error) {
          console.error("🔔 [NotificationsContext] Error marking all notifications as read:", error);
          // Continue anyway to update local state
        }
      } catch (error) {
        console.error("🔔 [NotificationsContext] Error marking all notifications as read:", error);
      }
    }
    
    // Update local state
    setReadNotificationIds((prev) => {
      const newSet = new Set([...prev, ...allIds]);
      readNotificationIdsRef.current = newSet; // Update ref
      
      if (user?.id) {
        localStorage.setItem(
          `notifications_read_${user.id}`,
          JSON.stringify(Array.from(newSet))
        );
      }
      
      return newSet;
    });

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications, user?.id]);

  // Cleanup old read notifications (older than 7 days)
  const cleanupOldNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Delete read notifications older than 7 days
      const { error } = await supabase
        .from("client_notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("read", true)
        .lt("updated_at", sevenDaysAgo.toISOString());
      
      if (error) {
        console.error("🔔 [NotificationsContext] Error cleaning up old notifications:", error);
      } else {
        console.log("🧹 [NotificationsContext] Cleaned up old read notifications");
        // Refetch to update local state
        fetchNotifications();
      }
    } catch (error) {
      console.error("🔔 [NotificationsContext] Error cleaning up old notifications:", error);
    }
  }, [user?.id, fetchNotifications]);

  // Run cleanup on mount and every 24 hours
  useEffect(() => {
    if (!user?.id) return;
    
    // Run cleanup immediately
    cleanupOldNotifications();
    
    // Run cleanup every 24 hours
    const interval = setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user?.id, cleanupOldNotifications]);

  const deleteNotification = useCallback(async (id: string) => {
    // Delete from database
    try {
      const { error } = await supabase
        .from("client_notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id);
      
      if (error) {
        console.error("🔔 [NotificationsContext] Error deleting notification:", error);
        // Continue anyway to update local state
      }
    } catch (error) {
      console.error("🔔 [NotificationsContext] Error deleting notification:", error);
    }
    
    // Update local state
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    
    setReadNotificationIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      readNotificationIdsRef.current = newSet; // Update ref
      
      if (user?.id) {
        localStorage.setItem(
          `notifications_read_${user.id}`,
          JSON.stringify(Array.from(newSet))
        );
      }
      
      return newSet;
    });
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        loading,
        error,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

