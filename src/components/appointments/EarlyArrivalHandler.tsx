import { useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { EarlyArrivalModal } from "./EarlyArrivalModal";
import { supabase } from "@/integrations/supabase/client";
import { respondToEarlyArrivalRequest } from "@/lib/earlyArrivalService";
import { useAppointments } from "@/hooks/useAppointments";

export const EarlyArrivalHandler = () => {
  const { notifications, markAsRead, refetch } = useNotifications();
  const { confirmEarlyArrival } = useAppointments();
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

  const handleConfirm = async () => {
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
          // Continue anyway to update the appointment
        }
      }
      
      // Update the appointment to confirm early arrival
      const result = await confirmEarlyArrival(pendingEarlyArrival.appointmentId);
      
      if (result.success) {
        // Mark notification as read
        markAsRead(pendingEarlyArrival.notificationId);
        // Refetch notifications to update the list
        refetch();
        setPendingEarlyArrival(null);
      } else {
        throw new Error(result.error || "Error confirming early arrival");
      }
    } catch (error) {
      console.error("Error confirming early arrival:", error);
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleReject = async () => {
    if (!pendingEarlyArrival) return;
    
    try {
      // If there's a request_id, respond to it
      if (pendingEarlyArrival.requestId) {
        const result = await respondToEarlyArrivalRequest(
          pendingEarlyArrival.requestId,
          'rejected'
        );
        
        if (!result.success) {
          console.error("Error responding to early arrival request:", result.error);
        }
      }
      
      // Mark notification as read even if rejected
      markAsRead(pendingEarlyArrival.notificationId);
      // Refetch notifications to update the list
      refetch();
      setPendingEarlyArrival(null);
    } catch (error) {
      console.error("Error rejecting early arrival:", error);
    }
  };

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

