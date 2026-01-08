import { useEffect, useState, useCallback } from "react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { EarlyArrivalModal } from "./EarlyArrivalModal";
import { supabase } from "@/integrations/supabase/client";
import { respondToEarlyArrivalRequest } from "@/lib/earlyArrivalService";

// Direct function to confirm early arrival without using the full hook
const confirmEarlyArrivalDirect = async (appointmentId: string) => {
  try {
    const { error } = await supabase
      .from("appointments")
      .update({ early_confirmed: true })
      .eq("id", appointmentId);
    
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error confirming early arrival:", err);
    return { success: false, error: err.message };
  }
};

export const EarlyArrivalHandler = () => {
  const { notifications, markAsRead, refetch } = useNotifications();
  const [pendingEarlyArrival, setPendingEarlyArrival] = useState<{
    appointmentId: string;
    notificationId: string;
    requestId?: string;
  } | null>(null);

  useEffect(() => {
    const checkAndShowEarlyArrival = async () => {
      // Find unread notifications of type early_arrival
      const earlyArrivalNotification = notifications.find(
        (n) =>
          !n.read &&
          n.appointment_id &&
          (
            n.meta?.type === "early_arrival" || 
            n.meta?.type === "early_arrival_request"
          )
      );

      if (earlyArrivalNotification && earlyArrivalNotification.appointment_id) {
        // Check if the appointment hasn't already been confirmed for early arrival
        try {
          const { data, error } = await supabase
            .from("appointments")
            .select("early_confirmed")
            .eq("id", earlyArrivalNotification.appointment_id)
            .single();

          if (error) {
            console.error("Error checking appointment status:", error);
            return;
          }

          // Only show modal if early_confirmed is false or null
          if (!data?.early_confirmed) {
            setPendingEarlyArrival({
              appointmentId: earlyArrivalNotification.appointment_id,
              notificationId: earlyArrivalNotification.id,
              requestId: earlyArrivalNotification.meta?.request_id,
            });
          }
        } catch (error) {
          console.error("Error checking appointment status:", error);
        }
      } else {
        setPendingEarlyArrival(null);
      }
    };

    checkAndShowEarlyArrival();
  }, [notifications]);

  const handleConfirm = useCallback(async () => {
    if (!pendingEarlyArrival) return;
    
    try {
      // If there's a request_id, respond to it first
      if (pendingEarlyArrival.requestId) {
        const result = await respondToEarlyArrivalRequest(
          pendingEarlyArrival.requestId,
          'accepted'
        );
        
        if (!result.success) {
          console.error("Error responding to early arrival request:", result.error);
        }
      }
      
      // Update the appointment to confirm early arrival (direct call, no hook)
      const result = await confirmEarlyArrivalDirect(pendingEarlyArrival.appointmentId);
      
      if (result.success) {
        markAsRead(pendingEarlyArrival.notificationId);
        refetch();
        setPendingEarlyArrival(null);
      } else {
        throw new Error(result.error || "Error confirming early arrival");
      }
    } catch (error) {
      console.error("Error confirming early arrival:", error);
      throw error;
    }
  }, [pendingEarlyArrival, markAsRead, refetch]);

  const handleReject = useCallback(async () => {
    if (!pendingEarlyArrival) return;
    
    try {
      if (pendingEarlyArrival.requestId) {
        const result = await respondToEarlyArrivalRequest(
          pendingEarlyArrival.requestId,
          'rejected'
        );
        
        if (!result.success) {
          console.error("Error responding to early arrival request:", result.error);
        }
      }
      
      markAsRead(pendingEarlyArrival.notificationId);
      refetch();
      setPendingEarlyArrival(null);
    } catch (error) {
      console.error("Error rejecting early arrival:", error);
    }
  }, [pendingEarlyArrival, markAsRead, refetch]);

  if (!pendingEarlyArrival) return null;

  return (
    <EarlyArrivalModal
      open={true}
      appointmentId={pendingEarlyArrival.appointmentId}
      onConfirm={handleConfirm}
      onReject={handleReject}
    />
  );
};
