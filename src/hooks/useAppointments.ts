import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type AppointmentRow = Tables<"appointments">;

export interface Appointment extends AppointmentRow {
  establishment?: {
    id: string;
    name: string;
    main_image: string | null;
    address: string | null;
  } | null;
  staff?: {
    id: string;
    full_name: string | null;
  } | null;
  services?: Array<{
    id: string;
    name: string;
    price: number;
    price_rd: number;
    price_usd: number;
    duration_minutes: number;
    currency?: string;
  }>;
  price_currency?: string;
  price_rd?: number;
  price_usd?: number;
}

export interface CreateAppointmentData {
  establishment_id: string; // business_id (renamed for backward compatibility)
  staff_id?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  date: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  price: number;
  duration_minutes: number;
  services: Array<{ id: string; name: string; price: number; duration_minutes: number }>;
}

// Helper to validate UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Calculate end time properly (handles overflow past midnight)
const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, mins] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24; // Wrap around at 24
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
};

export function useAppointments() {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyFull, setHistoryFull] = useState(false); // Banner de historial lleno

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query with user filtering
      let query = supabase
        .from("appointments")
        .select(`
          *,
          businesses:business_id (id, business_name, logo_url, cover_image_url, address),
          staff:staff_id (id, full_name),
          appointment_services (
            service_id,
            price,
            services:service_id (
              id,
              name,
              duration_minutes,
              price,
              price_currency,
              price_usd
            )
          ),
          services:service_id (
            id,
            price,
            price_currency,
            price_usd
          )
        `);

      // Filter by user_id if logged in
      if (user?.id) {
        query = query.eq("user_id", user.id);
      } else if (profile?.email) {
        // For guests, try to match by email
        query = query.eq("client_email", profile.email);
      }
      // If no user or email, show all appointments (for debugging - should be filtered in production)

      // Don't filter by status - we want all appointments (pending, confirmed, completed, cancelled)
      const { data, error } = await query.order("date", { ascending: false }).order("start_time", { ascending: false });

      if (error) {
        console.error("Error fetching appointments:", error);
        throw error;
      }

      const transformedData = ((data || []) as any[]).map((apt) => {
        // Use businesses data (establishments table no longer exists)
        const bizData = apt.businesses;
        
        const establishment = bizData ? {
          id: bizData.id,
          name: bizData.business_name || "Sin nombre",
          main_image: bizData.logo_url || bizData.cover_image_url,
          address: bizData.address,
        } : null;

        // Transform appointment_services to services array
        // Use prices DIRECTLY from services table (NO conversions, just display what Partner app configured)
        const services = (apt.appointment_services || []).map((aps: any) => {
          // IMPORTANT: Always use services table prices, NOT appointment_services.price
          // The appointment_services.price might be outdated or incorrect
          
          // Get service data from nested relationship
          // Supabase returns nested data as: aps.services (from the join)
          const serviceData = aps.services;
          
          if (!serviceData || !serviceData.id) {
            // If no service data, return a placeholder
            return {
              id: aps.service_id || '',
              name: "Servicio",
              price: 0,
              price_rd: 0,
              price_usd: 0,
              duration_minutes: 0,
              currency: "DOP",
            };
          }
          
          // Get currency (default to DOP)
          const serviceCurrency = serviceData.price_currency || "DOP";
          
          // Parse price (Supabase returns numeric as strings sometimes)
          const parseNumeric = (value: any): number => {
            if (value == null || value === undefined) return 0;
            if (typeof value === 'number') return isNaN(value) ? 0 : value;
            if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return 0;
              const parsed = parseFloat(trimmed);
              return isNaN(parsed) ? 0 : parsed;
            }
            return 0;
          };
          
          const servicePriceBase = parseNumeric(serviceData.price);
          const servicePriceUsd = parseNumeric(serviceData.price_usd);
          const durationMinutes = parseNumeric(serviceData.duration_minutes);
          
          // Determine prices based on currency
          // If currency is DOP (default): price = RD$, price_usd = USD
          // If currency is USD: price = USD, price_usd = RD$
          let priceRD = 0;
          let priceUSD = 0;
          
          if (serviceCurrency === "USD" || serviceCurrency === "$") {
            priceUSD = servicePriceBase;
            priceRD = servicePriceUsd;
          } else {
            // Default: DOP/RD$
            priceRD = servicePriceBase;
            priceUSD = servicePriceUsd;
          }
          
          return {
            id: serviceData.id || aps.service_id || '',
            name: serviceData.name || "Servicio",
            price: servicePriceBase,
            price_rd: priceRD,
            price_usd: priceUSD,
            duration_minutes: durationMinutes,
            currency: serviceCurrency,
          };
        });

        // Calculate total prices in both currencies
        const totalPriceRD = services.reduce((sum, s) => sum + (Number(s.price_rd) || 0), 0);
        const totalPriceUSD = services.reduce((sum, s) => sum + (Number(s.price_usd) || 0), 0);
        
        // Determine appointment currency - use first service's currency
        const appointmentCurrency = services.length > 0 ? services[0].currency : "RD$";

        return {
          ...apt,
          establishment,
          staff: apt.staff,
          services: services.length > 0 ? services : undefined,
          price_currency: appointmentCurrency,
          price_rd: totalPriceRD,
          price_usd: totalPriceUSD,
        };
      }) as Appointment[];

      // Debug: Uncomment for development
      // console.log("Fetched appointments:", {
      //   total: transformedData.length,
      //   byStatus: {
      //     pending: transformedData.filter(a => a.status === "pending").length,
      //     confirmed: transformedData.filter(a => a.status === "confirmed").length,
      //     completed: transformedData.filter(a => a.status === "completed").length,
      //     cancelled: transformedData.filter(a => a.status === "cancelled").length,
      //   },
      //   completedAppointments: transformedData.filter(a => a.status === "completed").map(a => ({
      //     id: a.id,
      //     date: a.date,
      //     start_time: a.start_time,
      //     status: a.status
      //   }))
      // });
      
      setAppointments(transformedData);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.email]);

  const createAppointment = async (appointmentData: CreateAppointmentData) => {
    try {
      // Use user from context (already available)
      // Validate business_id is a valid UUID
      let inputId = appointmentData.establishment_id; // This is actually business_id
      
      console.log("Creating appointment with business_id:", inputId);
      
      if (!isValidUUID(inputId)) {
        throw new Error("Invalid business ID provided");
      }

      // Verify business exists
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", inputId)
        .maybeSingle();
      
      if (!bizData) {
        throw new Error("Business not found");
      }
      
      console.log("Business verified:", inputId);
      
      // Calculate end time properly
      const endTime = calculateEndTime(appointmentData.start_time, appointmentData.duration_minutes);

      // Validate staff_id if provided
      let staffId = appointmentData.staff_id || null;
      if (staffId && !isValidUUID(staffId)) {
        staffId = null;
      }

      // Get the first valid service ID for appointments.service_id (for Partner app compatibility)
      const firstValidServiceId = appointmentData.services.find(s => isValidUUID(s.id))?.id || null;

      // Build insert data based on source table
      const insertData: TablesInsert<"appointments"> = {
        user_id: user?.id || null, // Add user_id to link appointment to user
        staff_id: staffId,
        service_id: firstValidServiceId, // Set service_id for Partner app calendar view compatibility
        client_name: appointmentData.client_name,
        client_email: appointmentData.client_email || null,
        client_phone: appointmentData.client_phone || null,
        date: appointmentData.date,
        start_time: appointmentData.start_time,
        end_time: endTime,
        notes: appointmentData.notes || null,
        price: appointmentData.price,
        duration_minutes: appointmentData.duration_minutes,
        status: "pending", // Citas comienzan como pendientes hasta que el establecimiento las confirme
      };

      // Use business_id (establishments table no longer exists)
      insertData.business_id = inputId;
      console.log("Saving appointment with business_id:", inputId);

      console.log("Insert data:", JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from("appointments")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting appointment:", error);
        throw error;
      }
      
      console.log("Appointment created successfully:", data);

      // Insert appointment services (only if service IDs are valid UUIDs)
      if (appointmentData.services.length > 0 && data) {
        const validServices = appointmentData.services.filter(s => isValidUUID(s.id));
        
        if (validServices.length > 0) {
          const servicesData: TablesInsert<"appointment_services">[] = validServices.map((service) => ({
            appointment_id: (data as { id: string }).id,
            service_id: service.id,
            price: service.price,
          }));

          const { error: servicesError } = await supabase
            .from("appointment_services")
            .insert(servicesData);

          if (servicesError) {
            console.error("Error inserting services:", servicesError);
            // Log the error but don't fail the appointment creation
            console.warn("Services were not saved to appointment_services, but appointment was created with service_id:", firstValidServiceId);
          } else {
            console.log("Successfully saved", validServices.length, "service(s) to appointment_services");
          }
        }
      }

      await fetchAppointments();
      return { data, error: null };
    } catch (err: any) {
      console.error("Error creating appointment:", err);
      return { data: null, error: err.message };
    }
  };

  // Cleanup old completed appointments if history exceeds 15
  const cleanupOldAppointments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Get all completed and cancelled appointments (history)
      const { data: historyAppointments, error: fetchError } = await supabase
        .from("appointments")
        .select("id, date, start_time, status, created_at")
        .eq("user_id", user.id)
        .in("status", ["completed", "cancelled"])
        .order("date", { ascending: false })
        .order("start_time", { ascending: false });
      
      if (fetchError) {
        console.error("Error fetching history for cleanup:", fetchError);
        return;
      }
      
      const historyCount = historyAppointments?.length || 0;
      
      // Check if history is full (15 or more)
      if (historyCount >= 15) {
        setHistoryFull(true);
        
        // Auto-cleanup: Delete all completed appointments if exactly at 15 limit
        // This ensures we always have space for new appointments
        if (historyCount === 15) {
          // Get IDs of oldest completed appointments to delete
          const appointmentsToDelete = historyAppointments
            .filter(apt => apt.status === "completed")
            .slice(15); // Keep first 15, delete rest
          
          if (appointmentsToDelete.length > 0) {
            const idsToDelete = appointmentsToDelete.map(apt => apt.id);
            
            const { error: deleteError } = await supabase
              .from("appointments")
              .delete()
              .in("id", idsToDelete);
            
            if (deleteError) {
              console.error("Error auto-deleting old appointments:", deleteError);
            } else {
              console.log(`🧹 Auto-deleted ${idsToDelete.length} old completed appointments`);
              // Refetch to update local state
              fetchAppointments();
            }
          }
        }
      } else {
        setHistoryFull(false);
      }
    } catch (error) {
      console.error("Error cleaning up old appointments:", error);
    }
  }, [user?.id]);

  // Check history limit whenever appointments change
  useEffect(() => {
    if (appointments.length > 0) {
      cleanupOldAppointments();
    }
  }, [appointments.length, cleanupOldAppointments]);

  const cancelAppointment = async (appointmentId: string) => {
    try {
      console.log("Cancelling appointment:", appointmentId);
      
      // First verify the appointment exists
      const { data: existingApt, error: fetchError } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("id", appointmentId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching appointment:", fetchError);
        throw new Error(`Error al buscar la cita: ${fetchError.message}`);
      }

      if (!existingApt) {
        throw new Error("La cita no existe en el sistema");
      }

      console.log("Found appointment:", existingApt);

      // Perform the update
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "cancelled" } as TablesUpdate<"appointments">)
        .eq("id", appointmentId);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw new Error(`Error al actualizar: ${updateError.message}`);
      }

      console.log("Appointment cancelled successfully");

      toast({
        title: "Cita cancelada",
        description: "Tu cita ha sido cancelada exitosamente.",
      });

      // Refresh appointments immediately
      await fetchAppointments();
      return { success: true };
    } catch (err: any) {
      console.error("Error cancelling appointment:", err);
      toast({
        title: "Error",
        description: `No se pudo cancelar la cita: ${err.message}`,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  const updateAppointment = async (appointmentId: string, updates: TablesUpdate<"appointments">) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", appointmentId);

      if (error) throw error;

      await fetchAppointments();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const confirmEarlyArrival = async (appointmentId: string) => {
    try {
      // CRITICAL: Only mark early_confirmed=true, DO NOT change date/time
      // The date/time should only change when the Partner app marks it as completed
      // This ensures the appointment remains in "upcoming" until actually completed
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          early_confirmed: true,
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;

      // Refresh appointments to reflect the change
      // This will trigger realtime updates in all components that use appointments
      await fetchAppointments();

      return { success: true };
    } catch (err: any) {
      console.error("Error confirming early arrival:", err);
      return { success: false, error: err.message };
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    try {
      console.log("Deleting appointment:", appointmentId);
      
      // First verify the appointment exists and belongs to the user
      const { data: existingApt, error: fetchError } = await supabase
        .from("appointments")
        .select("id, user_id, client_email")
        .eq("id", appointmentId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching appointment:", fetchError);
        throw new Error(`Error al buscar la cita: ${fetchError.message}`);
      }

      if (!existingApt) {
        throw new Error("La cita no existe en el sistema");
      }

      // Verify ownership
      if (user?.id && existingApt.user_id !== user.id) {
        throw new Error("No tienes permiso para eliminar esta cita");
      }

      if (!user?.id && profile?.email && existingApt.client_email !== profile.email) {
        throw new Error("No tienes permiso para eliminar esta cita");
      }

      // Delete appointment_services first (cascade might handle this, but let's be explicit)
      const { error: servicesError } = await supabase
        .from("appointment_services")
        .delete()
        .eq("appointment_id", appointmentId);

      if (servicesError) {
        console.warn("Error deleting appointment services (may not exist):", servicesError);
        // Continue anyway, as the appointment might not have services
      }

      // Delete the appointment
      const { error: deleteError } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentId);

      if (deleteError) {
        console.error("Supabase delete error:", deleteError);
        throw new Error(`Error al eliminar: ${deleteError.message}`);
      }

      console.log("Appointment deleted successfully");

      toast({
        title: "Cita eliminada",
        description: "La cita ha sido eliminada de tu historial exitosamente.",
      });

      // Refresh appointments immediately
      await fetchAppointments();
      return { success: true };
    } catch (err: any) {
      console.error("Error deleting appointment:", err);
      toast({
        title: "Error",
        description: `No se pudo eliminar la cita: ${err.message}`,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  // Use ref for channel to ensure proper cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelIdRef = useRef<string>(`appointments-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    fetchAppointments();

    // Cleanup previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create unique channel ID to prevent duplicates
    const uniqueChannelId = `appointments-${user?.id || 'anon'}-${Date.now()}`;
    channelIdRef.current = uniqueChannelId;

    // Subscribe to realtime changes for appointments
    const channel = supabase
      .channel(uniqueChannelId)
      .on(
        "postgres_changes",
        { 
          event: "*",
          schema: "public", 
          table: "appointments"
        },
        (payload) => {
          console.log("Appointment changed:", payload);
          fetchAppointments();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, profile?.email, fetchAppointments]);

  // Helper to compare dates properly (date + time)
  const isDateInFuture = (dateStr: string | null, timeStr: string | null): boolean => {
    if (!dateStr) return false;
    
    const now = new Date();
    const nowTime = now.getTime();
    
    // Parse date string (format: YYYY-MM-DD)
    const [year, month, day] = dateStr.split("-").map(Number);
    
    // Parse time string (format: HH:MM or HH:MM:SS)
    let hours = 0;
    let minutes = 0;
    if (timeStr) {
      const timeParts = timeStr.split(":").map(Number);
      hours = timeParts[0] || 0;
      minutes = timeParts[1] || 0;
    }
    
    // Create appointment date in local timezone
    const appointmentDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const appointmentTime = appointmentDate.getTime();
    
    // Compare timestamps
    return appointmentTime > nowTime;
  };

  // Memoize upcoming appointments filtering to avoid recalculation on every render
  const upcomingAppointments = useMemo(() => {
    return appointments.filter(
      (apt) => 
        (apt.status === "confirmed" || apt.status === "pending") && 
        isDateInFuture(apt.date, apt.start_time)
    );
  }, [appointments]);

  // Memoize past appointments filtering to avoid recalculation on every render
  const pastAppointments = useMemo(() => {
    return appointments.filter(
      (apt) => {
        // Include completed appointments (regardless of date) - PRIORITY
        if (apt.status === "completed") {
          return true;
        }
        // Include cancelled appointments (regardless of date)
        if (apt.status === "cancelled") return true;
        // Include appointments that are in the past (pending, confirmed, etc.)
        // BUT exclude if they are completed (already handled above)
        if (apt.status !== "completed" && apt.date && !isDateInFuture(apt.date, apt.start_time)) {
          return true;
        }
        return false;
      }
    );
  }, [appointments]);
  
  // Debug: Uncomment for development
  // console.log("Appointments filtering:", {
  //   total: appointments.length,
  //   completed: appointments.filter(a => a.status === "completed").length,
  //   pastAppointments: pastAppointments.length,
  //   completedInPast: pastAppointments.filter(a => a.status === "completed").length,
  //   completedAppointments: appointments.filter(a => a.status === "completed").map(a => ({
  //     id: a.id,
  //     date: a.date,
  //     time: a.start_time,
  //     status: a.status
  //   }))
  // });

  // Memoize cancelled appointments filtering to avoid recalculation on every render
  const cancelledAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.status === "cancelled");
  }, [appointments]);

  return {
    appointments,
    upcomingAppointments,
    pastAppointments,
    cancelledAppointments,
    loading,
    error,
    historyFull, // Exportar estado de historial lleno
    createAppointment,
    cancelAppointment,
    updateAppointment,
    deleteAppointment,
    confirmEarlyArrival,
    refetch: fetchAppointments,
  };
}
