import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { queryWithTimeout, createRealtimeSubscription } from "@/lib/supabaseHelpers";

export interface BusinessHours {
  openTime: string; // "07:00"
  closeTime: string; // "23:00"
  lunchStart?: string; // "12:00"
  lunchEnd?: string; // "14:00"
  intervalMinutes?: number; // default 30
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

type DBWorkingHours = Tables<"business_working_hours">;

// Fetch business hours from database - checks both tables
export function useDBBusinessHours(establishmentId?: string, selectedDate?: Date) {
  const [hours, setHours] = useState<BusinessHours | null>(null);
  const [allHours, setAllHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHours = useCallback(async () => {
    if (!establishmentId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch from business_hours (Partner app uses this) with timeout
      const queryPromise = supabase
        .from("business_hours")
        .select("*")
        .eq("business_id", establishmentId);
      
      // Ejecutar query con timeout
      const result = await queryWithTimeout(
        queryPromise as unknown as Promise<{ data: any; error: any }>,
        20000
      );
      const { data: bizHoursData, error: bizError } = result;

      if (!bizError && bizHoursData && bizHoursData.length > 0) {
        // Cast to handle break_start/break_end which exist in DB but not in generated types
        const hoursWithBreaks = bizHoursData as Array<typeof bizHoursData[0] & { break_start?: string | null; break_end?: string | null }>;
        setAllHours(hoursWithBreaks.map(h => ({
          day_of_week: h.day_of_week,
          is_open: !h.is_closed,
          start_time: h.open_time,
          end_time: h.close_time,
          lunch_start: h.break_start || null,
          lunch_end: h.break_end || null,
        })));
        setLoading(false);
        return;
      }

      // No hours found in either table
      setAllHours([]);
    } catch (err) {
      console.error("Error fetching business hours:", err);
    } finally {
      setLoading(false);
    }
  }, [establishmentId]);

  useEffect(() => {
    fetchHours();

    // Subscribe to realtime changes for business_hours with error handling
    if (establishmentId) {
      const cleanup = createRealtimeSubscription(
        supabase,
        `business-hours-${establishmentId}`,
        {
          table: "business_hours",
          filter: `business_id=eq.${establishmentId}`,
          event: "*",
          onEvent: (payload) => {
            console.log("Business hours changed:", payload);
            fetchHours();
          },
          onError: (error) => {
            console.error("Error en suscripción de business hours:", error);
          },
        }
      );

      return cleanup;
    }
  }, [establishmentId, fetchHours]);

  // Update hours when selected date changes
  useEffect(() => {
    if (allHours.length === 0) {
      setHours(null);
      return;
    }
    
    const targetDate = selectedDate || new Date();
    const dayOfWeek = targetDate.getDay();
    const dayHours = allHours.find((h) => h.day_of_week === dayOfWeek);
    
    if (dayHours && dayHours.is_open !== false) {
      // Format time from "HH:MM:SS" or "HH:MM" to "HH:MM"
      const formatTime = (time: string | null): string => {
        if (!time) return "09:00";
        // Handle both "HH:MM:SS" and "HH:MM" formats
        return time.substring(0, 5);
      };
      
      const startTime = formatTime(dayHours.start_time);
      const endTime = formatTime(dayHours.end_time);
      const lunchStart = dayHours.lunch_start ? formatTime(dayHours.lunch_start) : undefined;
      const lunchEnd = dayHours.lunch_end ? formatTime(dayHours.lunch_end) : undefined;
      
      setHours({
        openTime: startTime,
        closeTime: endTime,
        lunchStart: lunchStart,
        lunchEnd: lunchEnd,
        intervalMinutes: 30,
      });
    } else {
      setHours(null); // Closed on this day
    }
  }, [allHours, selectedDate]);

  return { hours, loading, isClosed: allHours.length > 0 && !hours };
}

export function useBusinessHours(
  businessHours: BusinessHours = {
    openTime: "09:00",
    closeTime: "20:00",
    lunchStart: "12:00",
    lunchEnd: "14:00",
    intervalMinutes: 30,
  },
  bookedSlots: string[] = [], // Array of booked times like ["09:00", "10:30"]
  selectedDate?: Date
) {
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const interval = businessHours.intervalMinutes || 30;
    
    // Parse times to minutes for easier comparison
    const parseTime = (time: string): number => {
      const [hours, mins] = time.split(":").map(Number);
      return hours * 60 + mins;
    };
    
    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };
    
    const openMinutes = parseTime(businessHours.openTime);
    const closeMinutes = parseTime(businessHours.closeTime);
    const lunchStartMinutes = businessHours.lunchStart ? parseTime(businessHours.lunchStart) : null;
    const lunchEndMinutes = businessHours.lunchEnd ? parseTime(businessHours.lunchEnd) : null;
    
    // Check if selected date is today
    const now = new Date();
    const isToday = selectedDate && 
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();
    
    const currentTimeMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;
    
    let slotId = 1;
    
    for (let currentMinutes = openMinutes; currentMinutes < closeMinutes; currentMinutes += interval) {
      const timeStr = formatTime(currentMinutes);
      
      // Skip lunch break
      const isDuringLunch = lunchStartMinutes !== null && 
        lunchEndMinutes !== null &&
        currentMinutes >= lunchStartMinutes && 
        currentMinutes < lunchEndMinutes;
      
      if (isDuringLunch) continue;
      
      // Check if slot is booked
      const isBooked = bookedSlots.includes(timeStr);
      
      // Check if slot is in the past (for today)
      const isPastTime = isToday && currentMinutes <= currentTimeMinutes;
      
      slots.push({
        id: `slot-${slotId++}`,
        time: timeStr,
        available: !isBooked && !isPastTime,
      });
    }
    
    return slots;
  }, [businessHours, bookedSlots, selectedDate]);

  return { timeSlots };
}

// Business hours per establishment - synced with database
// These are fallback defaults if DB doesn't have hours
const establishmentBusinessHours: Record<string, BusinessHours> = {
  // Glam Studio - Real ID
  "63806887-1f0e-4292-84a0-8a3ce5f560d2": {
    openTime: "09:00",
    closeTime: "20:00",
    lunchStart: "12:00",
    lunchEnd: "14:00",
    intervalMinutes: 30,
  },
  // Serenity Spa - Real ID
  "98a62228-373f-45fc-bbb5-52700c61ff6e": {
    openTime: "08:00",
    closeTime: "21:00",
    lunchStart: "13:00",
    lunchEnd: "14:00",
    intervalMinutes: 30,
  },
  // Default for other establishments
  "default": {
    openTime: "09:00",
    closeTime: "20:00",
    lunchStart: "12:00",
    lunchEnd: "14:00",
    intervalMinutes: 30,
  },
};

// Helper to get business hours for an establishment
export function getDefaultBusinessHours(establishmentId?: string): BusinessHours {
  if (establishmentId && establishmentBusinessHours[establishmentId]) {
    return establishmentBusinessHours[establishmentId];
  }
  return establishmentBusinessHours["default"];
}
