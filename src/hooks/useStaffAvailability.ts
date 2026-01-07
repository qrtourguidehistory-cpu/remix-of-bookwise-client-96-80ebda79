import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

type StaffSchedule = Tables<"staff_schedules">;

interface StaffAppointment {
  staff_id: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
}

export function useStaffAvailability(
  establishmentId?: string,
  staffId?: string | null,
  selectedDate?: Date
) {
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [staffAppointments, setStaffAppointments] = useState<StaffAppointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch staff schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!staffId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("staff_schedules")
          .select("*")
          .eq("staff_id", staffId);

        if (!error && data) {
          setStaffSchedules(data as StaffSchedule[]);
        }
      } catch (err) {
        console.error("Error fetching staff schedules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [staffId]);

  // Fetch staff appointments for the selected date
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!staffId || !selectedDate) {
        setStaffAppointments([]);
        return;
      }
      
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("staff_id, start_time, end_time, duration_minutes")
          .eq("staff_id", staffId)
          .eq("date", dateStr)
          .neq("status", "cancelled");

        if (!error && data) {
          setStaffAppointments(data as StaffAppointment[]);
        }
      } catch (err) {
        console.error("Error fetching staff appointments:", err);
      }
    };

    fetchAppointments();
  }, [staffId, selectedDate]);

  // Check if staff is available on a specific day
  const isStaffWorkingOnDay = (date: Date): boolean => {
    if (!staffId || staffSchedules.length === 0) return true; // Assume available if no schedule
    
    const dayOfWeek = date.getDay();
    const schedule = staffSchedules.find(s => s.day_of_week === dayOfWeek);
    
    return schedule ? schedule.is_available !== false : true;
  };

  // Get staff working hours for a specific day
  const getStaffHoursForDay = (date: Date): { start: string; end: string } | null => {
    if (!staffId || staffSchedules.length === 0) return null;
    
    const dayOfWeek = date.getDay();
    const schedule = staffSchedules.find(s => s.day_of_week === dayOfWeek);
    
    if (schedule && schedule.is_available !== false) {
      return {
        start: schedule.start_time.substring(0, 5),
        end: schedule.end_time.substring(0, 5)
      };
    }
    
    return null;
  };

  // Check if a time slot is available for the staff member
  const isTimeSlotAvailable = (time: string): boolean => {
    if (!staffId) return true;

    // Check staff schedule for the day
    if (selectedDate) {
      const staffHours = getStaffHoursForDay(selectedDate);
      if (staffHours) {
        const timeMinutes = parseTimeToMinutes(time);
        const startMinutes = parseTimeToMinutes(staffHours.start);
        const endMinutes = parseTimeToMinutes(staffHours.end);
        
        if (timeMinutes < startMinutes || timeMinutes >= endMinutes) {
          return false;
        }
      }
    }

    // Check if staff has an appointment at this time
    const timeMinutes = parseTimeToMinutes(time);
    
    for (const apt of staffAppointments) {
      if (!apt.start_time) continue;
      
      const aptStartMinutes = parseTimeToMinutes(apt.start_time);
      const duration = apt.duration_minutes || 30;
      const aptEndMinutes = aptStartMinutes + duration;
      
      if (timeMinutes >= aptStartMinutes && timeMinutes < aptEndMinutes) {
        return false;
      }
    }

    return true;
  };

  // Get all unavailable times for the staff
  const getUnavailableTimes = (): string[] => {
    const unavailable: string[] = [];
    
    for (const apt of staffAppointments) {
      if (!apt.start_time) continue;
      unavailable.push(apt.start_time.substring(0, 5));
    }
    
    return unavailable;
  };

  return {
    staffSchedules,
    staffAppointments,
    loading,
    isStaffWorkingOnDay,
    getStaffHoursForDay,
    isTimeSlotAvailable,
    getUnavailableTimes
  };
}

// Helper function to parse time string to minutes
function parseTimeToMinutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}
