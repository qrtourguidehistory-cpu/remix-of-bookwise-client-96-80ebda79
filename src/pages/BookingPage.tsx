import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/booking/DatePicker";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { MultiStaffSelection } from "@/components/booking/MultiStaffSelection";
import { Service } from "@/components/business/ServiceItem";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useAppointments } from "@/hooks/useAppointments";
import { useEstablishment } from "@/hooks/useEstablishments";
import { useDBBusinessHours, getDefaultBusinessHours } from "@/hooks/useBusinessHours";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

interface ServiceStaffAssignment {
  serviceId: string;
  serviceName: string;
  staffId: string | null;
}

type DayAppointment = {
  staff_id: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
};

type BusyInterval = { startMin: number; endMin: number };

const parseTimeToMinutes = (time: string): number => {
  // Supports "HH:MM" or "HH:MM:SS"
  const safe = time?.length >= 5 ? time.substring(0, 5) : time;
  const [h, m] = safe.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && aEnd > bStart;

function normalizeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin);
  const merged: BusyInterval[] = [];
  for (const iv of sorted) {
    if (merged.length === 0) {
      merged.push({ ...iv });
      continue;
    }
    const last = merged[merged.length - 1];
    if (iv.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, iv.endMin);
    } else {
      merged.push({ ...iv });
    }
  }
  return merged;
}

function generateDynamicStartTimes(opts: {
  openMin: number;
  closeMin: number;
  durationMin: number;
  breakStartMin?: number | null;
  breakEndMin?: number | null;
  busy: BusyInterval[];
  // If true, we step by duration (dynamic) instead of a fixed global interval.
  stepByDuration?: boolean;
  // Optional fallback step (minutes) to add more choices; keep undefined to avoid "grid explosion".
  fallbackStepMin?: number;
  // Minimum start time (for filtering past times on today)
  minStartMin?: number;
}): number[] {
  const {
    openMin,
    closeMin,
    durationMin,
    breakStartMin,
    breakEndMin,
    busy,
    stepByDuration = true,
    fallbackStepMin,
    minStartMin = 0,
  } = opts;

  if (durationMin <= 0) return [];
  const latestStart = closeMin - durationMin;
  if (latestStart < openMin) return [];
  
  // Effective open time is the max of openMin and minStartMin (for today)
  const effectiveOpenMin = Math.max(openMin, minStartMin);

  const mergedBusy = normalizeIntervals(
    busy
      .map((b) => ({
        startMin: clamp(b.startMin, effectiveOpenMin, closeMin),
        endMin: clamp(b.endMin, effectiveOpenMin, closeMin),
      }))
      .filter((b) => b.endMin > b.startMin)
  );

  const candidates = new Set<number>();
  candidates.add(effectiveOpenMin);

  // Appointment ends are natural next-candidate starts.
  for (const b of mergedBusy) candidates.add(b.endMin);

  // Break end is also a natural restart point.
  if (breakStartMin != null && breakEndMin != null) candidates.add(breakEndMin);

  const candidateList = [...candidates].sort((a, b) => a - b);
  const available = new Set<number>();

  const isInBreak = (start: number, end: number) => {
    if (breakStartMin == null || breakEndMin == null) return false;
    return overlaps(start, end, breakStartMin, breakEndMin);
  };

  const nextBusyEndIfOverlap = (start: number, end: number): number | null => {
    let nextEnd: number | null = null;
    for (const b of mergedBusy) {
      if (overlaps(start, end, b.startMin, b.endMin)) {
        nextEnd = nextEnd == null ? b.endMin : Math.max(nextEnd, b.endMin);
      }
    }
    return nextEnd;
  };

  for (const base of candidateList) {
    let t = clamp(base, effectiveOpenMin, latestStart);

    while (t <= latestStart) {
      const end = t + durationMin;

      // Break handling
      if (isInBreak(t, end)) {
        if (breakEndMin != null) {
          t = clamp(breakEndMin, effectiveOpenMin, latestStart + 1);
          continue;
        }
      }

      // Busy overlap handling
      const nextEnd = nextBusyEndIfOverlap(t, end);
      if (nextEnd != null) {
        t = clamp(nextEnd, effectiveOpenMin, latestStart + 1);
        continue;
      }

      // Valid start
      available.add(t);

      // Advance
      if (stepByDuration) {
        t = t + durationMin;
      } else if (fallbackStepMin && fallbackStepMin > 0) {
        t = t + fallbackStepMin;
      } else {
        // default safety
        t = t + durationMin;
      }
    }
  }

  return [...available].sort((a, b) => a - b);
}

const BookingPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const { establishment, staff: dbStaff, loading, error } = useEstablishment(id);
  const establishmentName = establishment?.name || "";
  
  const services = (location.state?.services as Service[]) || [];
  const { createAppointment } = useAppointments();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [staffAssignments, setStaffAssignments] = useState<ServiceStaffAssignment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dayAppointments, setDayAppointments] = useState<DayAppointment[]>([]);
  const [staffDaySchedules, setStaffDaySchedules] = useState<Record<string, { startMin: number; endMin: number; isAvailable: boolean }>>({});
  
  // Client info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  
  // Validation errors
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Transform DB staff to component format (used by availability + UI)
  const staffMembers = useMemo(() => {
    return dbStaff.length > 0
      ? dbStaff.map((s) => ({
          id: s.id,
          name: s.full_name || t("common.noName"),
          specialty: s.specialties?.join(", ") || "",
        }))
      : [];
  }, [dbStaff, t]);

  // If establishment has no staff rows, treat it as "owner-only" capacity = 1 (but don't show staff UI).
  const hasExplicitStaff = staffMembers.length > 0;
  const effectiveStaffIds = useMemo(() => {
    return hasExplicitStaff ? staffMembers.map((s) => s.id) : ["__owner__"];
  }, [hasExplicitStaff, staffMembers]);

  // Primary selected staff for booking (single service) / availability focus.
  // If there is exactly 1 staff member, auto-select them.
  const primaryStaffId = useMemo(() => {
    if (!hasExplicitStaff) return null;
    if (staffMembers.length === 1) return staffMembers[0].id;
    return staffAssignments[0]?.staffId || null;
  }, [hasExplicitStaff, staffMembers, staffAssignments]);

  // Get business hours from database or fallback to defaults
  const { hours: dbHours, loading: hoursLoading, isClosed } = useDBBusinessHours(establishment?.id || id, selectedDate || undefined);
  const defaultHours = getDefaultBusinessHours(id);
  const businessHours = dbHours || defaultHours;
  
  // Duration (minutes) is the single source of truth for blocking time.
  // If multiple services selected, we block the combined duration.
  const selectedDurationMinutes = useMemo(() => {
    const sum = services.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
    return sum > 0 ? sum : 30;
  }, [services]);

  // Fetch staff schedules for the selected day (optional, only if staff exists)
  useEffect(() => {
    const fetchStaffDaySchedules = async () => {
      if (!selectedDate) {
        setStaffDaySchedules({});
        return;
      }
      if (!hasExplicitStaff || staffMembers.length === 0) {
        setStaffDaySchedules({});
        return;
      }

      const establishmentId = establishment?.id || id;
      const dayOfWeek = selectedDate.getDay();
      const staffIds = staffMembers.map((s) => s.id);

      const { data, error } = await supabase
        .from("staff_schedules")
        .select("staff_id, start_time, end_time, is_available")
        .eq("business_id", establishmentId)
        .eq("day_of_week", dayOfWeek)
        .in("staff_id", staffIds);

      if (error) {
        console.error("Error fetching staff day schedules:", error);
        setStaffDaySchedules({});
        return;
      }

      const map: Record<string, { startMin: number; endMin: number; isAvailable: boolean }> = {};
      for (const row of (data as any[]) || []) {
        if (!row.staff_id) continue;
        map[row.staff_id] = {
          startMin: parseTimeToMinutes(row.start_time),
          endMin: parseTimeToMinutes(row.end_time),
          isAvailable: row.is_available !== false,
        };
      }
      setStaffDaySchedules(map);
    };

    fetchStaffDaySchedules();
  }, [selectedDate, hasExplicitStaff, staffMembers, establishment?.id, id]);

  const fetchDayAppointments = useCallback(async () => {
    if (!selectedDate || !id) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const establishmentId = establishment?.id || id;

    const { data, error } = await supabase
      .from("appointments")
      .select("staff_id, start_time, end_time, duration_minutes, status")
      .eq("business_id", establishmentId)
      .eq("date", dateStr)
      // CRITICAL: Only block slots for active appointments (pending, confirmed, arrived, started)
      // Completed appointments should NOT block future bookings
      // Cancelled appointments are excluded (not in this list)
      .in("status", ["pending", "confirmed", "arrived", "started"]);

    if (error) {
      console.error("Error fetching day appointments:", error);
      return;
    }

    setDayAppointments((data as any as DayAppointment[]) || []);
  }, [selectedDate, id, establishment?.id]);

  // Fetch day appointments when date changes (single source of truth: DB)
  useEffect(() => {
    fetchDayAppointments();

    if (!selectedDate) return;
    const establishmentId = establishment?.id || id;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Realtime updates: refresh availability when appointments change for this business.
    const channel = supabase
      .channel(`appointments-${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `business_id=eq.${establishmentId}`,
        },
        (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;
          const newDate = newRow?.date;
          const oldDate = oldRow?.date;

          // Only refetch if the changed row touches the selected date
          if (newDate === dateStr || oldDate === dateStr) {
            fetchDayAppointments();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDayAppointments, selectedDate, establishment?.id, id]);

  // Auto-assign staff when there's exactly 1 staff member (single-employee businesses)
  useEffect(() => {
    if (!hasExplicitStaff) return;
    if (staffMembers.length !== 1) return;
    if (services.length === 0) return;
    if (staffAssignments.length > 0) return;

    const onlyStaffId = staffMembers[0].id;
    setStaffAssignments(
      services.map((s) => ({
        serviceId: s.id,
        serviceName: s.name,
        staffId: onlyStaffId,
      }))
    );
  }, [hasExplicitStaff, staffMembers, services, staffAssignments.length]);

  const openMin = useMemo(() => parseTimeToMinutes(businessHours.openTime), [businessHours.openTime]);
  const closeMin = useMemo(() => parseTimeToMinutes(businessHours.closeTime), [businessHours.closeTime]);
  const breakStartMin = useMemo(
    () => (businessHours.lunchStart ? parseTimeToMinutes(businessHours.lunchStart) : null),
    [businessHours.lunchStart]
  );
  const breakEndMin = useMemo(
    () => (businessHours.lunchEnd ? parseTimeToMinutes(businessHours.lunchEnd) : null),
    [businessHours.lunchEnd]
  );

  // Build busy intervals per staff (or owner-only) from DB appointments (single source of truth).
  // CRITICAL: All appointments with status "pending", "confirmed", "arrived", "started" block slots immediately.
  // "completed" and "cancelled" appointments do NOT block slots (excluded from dayAppointments).
  const busyByStaffId = useMemo(() => {
    const map = new Map<string, BusyInterval[]>();

    // Initialize all staff keys
    for (const sid of effectiveStaffIds) map.set(sid, []);

    for (const apt of dayAppointments) {
      if (!apt.start_time) continue;
      const startMin = parseTimeToMinutes(apt.start_time);
      const duration = apt.duration_minutes ?? (apt.end_time ? null : 30);
      const endMin =
        apt.end_time && apt.end_time.length >= 5
          ? parseTimeToMinutes(apt.end_time)
          : startMin + (duration || 30);

      const interval = { startMin, endMin };

      // CRITICAL LOGIC FOR OWNER-ONLY BUSINESSES (no staff):
      // - If appointment has staff_id, it blocks only that specific staff.
      // - If staff_id is NULL (owner-only or unassigned), it blocks ALL capacity.
      //   For owner-only businesses, effectiveStaffIds = ["__owner__"], so it blocks the single owner.
      //   This ensures that when there's no staff, ANY appointment (pending or confirmed) blocks the time slot immediately.
      if (apt.staff_id) {
        const key = apt.staff_id;
        const list = map.get(key) || [];
        list.push(interval);
        map.set(key, list);
      } else {
        // staff_id is NULL: block ALL capacity (owner-only or unassigned)
        for (const sid of effectiveStaffIds) {
          const list = map.get(sid) || [];
          list.push(interval);
          map.set(sid, list);
        }
      }
    }

    // Normalize intervals for each staff
    for (const [k, list] of map.entries()) {
      map.set(k, normalizeIntervals(list));
    }

    return map;
  }, [dayAppointments, effectiveStaffIds]);

  // Check if selected date is today to filter past times
  const isToday = useMemo(() => {
    if (!selectedDate) return false;
    const now = new Date();
    return (
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  }, [selectedDate]);

  // Current time in minutes (with a small buffer of 15 minutes)
  const currentTimeMinutes = useMemo(() => {
    if (!isToday) return 0;
    const now = new Date();
    // Add 15 minute buffer - can't book appointments starting in less than 15 minutes
    return now.getHours() * 60 + now.getMinutes() + 15;
  }, [isToday]);

  // Dynamic availability:
  // - If no explicit staff: treat as capacity=1 (owner) using "__owner__" busy intervals.
  // - If 1 staff: capacity=1 using that staff busy intervals.
  // - If multiple staff: if a staff is selected, show that staff availability; otherwise show union of times where ANY staff is free.
  const availableStartTimes = useMemo(() => {
    if (!selectedDate) return [];
    if (isClosed) return [];

    const durationMin = selectedDurationMinutes;

    const computeForStaff = (sid: string) => {
      const busy = busyByStaffId.get(sid) || [];

      // If we have staff schedules for this staff/day, constrain the working window
      const sched = staffDaySchedules[sid];
      if (sched && sched.isAvailable === false) return [];
      const staffOpenMin = sched ? Math.max(openMin, sched.startMin) : openMin;
      const staffCloseMin = sched ? Math.min(closeMin, sched.endMin) : closeMin;

      return generateDynamicStartTimes({
        openMin: staffOpenMin,
        closeMin: staffCloseMin,
        durationMin,
        breakStartMin,
        breakEndMin,
        busy,
        stepByDuration: true,
        // CRITICAL: Pass minStartMin to filter past times when selected date is today
        minStartMin: isToday ? currentTimeMinutes : 0,
      });
    };

    // Owner-only / no staff rows
    if (!hasExplicitStaff) {
      return computeForStaff("__owner__");
    }

    // Exactly one staff member => capacity=1 => must not allow same hour
    if (staffMembers.length === 1) {
      return computeForStaff(staffMembers[0].id);
    }

    // Multiple staff
    if (primaryStaffId) {
      return computeForStaff(primaryStaffId);
    }

    // No specific staff selected yet: show union of all staff availabilities
    const union = new Set<number>();
    for (const s of staffMembers) {
      for (const t of computeForStaff(s.id)) union.add(t);
    }
    return [...union].sort((a, b) => a - b);
  }, [
    selectedDate,
    isClosed,
    selectedDurationMinutes,
    busyByStaffId,
    openMin,
    closeMin,
    breakStartMin,
    breakEndMin,
    hasExplicitStaff,
    staffMembers,
    primaryStaffId,
    staffDaySchedules,
    isToday,
    currentTimeMinutes,
  ]);

  const timeSlots = useMemo(() => {
    return availableStartTimes.map((m) => {
      const time = minutesToTime(m);
      return { id: time, time, available: true };
    });
  }, [availableStartTimes]);

  // If user had a selectedTime that is no longer valid after recalculation, reset it.
  useEffect(() => {
    if (!selectedTime) return;
    const stillExists = timeSlots.some((s) => s.id === selectedTime && s.available);
    if (!stillExists) setSelectedTime(null);
  }, [selectedTime, timeSlots]);

  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  // Check if all services have staff assigned (for multi-service)
  const allServicesHaveStaff = staffMembers.length === 0 || (services.length > 1 
    ? staffAssignments.every(a => a.staffId !== null)
    : staffAssignments.length > 0 && staffAssignments[0]?.staffId !== null);

  // Helper function to count digits in phone number
  const countDigits = (phone: string): number => {
    return phone.replace(/\D/g, '').length;
  };

  // Validate phone number: 9-14 digits
  const isValidPhone = (phone: string): boolean => {
    const digits = countDigits(phone);
    return digits >= 9 && digits <= 14;
  };

  // Validate form fields
  const validateForm = (): boolean => {
    let isValid = true;
    
    // Validate name
    if (!clientName.trim()) {
      setNameError(t("booking.nameRequired") || "El nombre es obligatorio");
      isValid = false;
    } else {
      setNameError("");
    }
    
    // Validate phone
    if (!clientPhone.trim()) {
      setPhoneError(t("booking.phoneRequired") || "El teléfono es obligatorio");
      isValid = false;
    } else if (!isValidPhone(clientPhone)) {
      const digits = countDigits(clientPhone);
      if (digits < 9) {
        setPhoneError(t("booking.phoneMinDigits") || "El teléfono debe tener mínimo 9 dígitos");
      } else {
        setPhoneError(t("booking.phoneMaxDigits") || "El teléfono debe tener máximo 14 dígitos");
      }
      isValid = false;
    } else {
      setPhoneError("");
    }
    
    return isValid;
  };

  const canConfirm = selectedDate && 
                     selectedTime && 
                     allServicesHaveStaff && 
                     clientName.trim() && 
                     clientPhone.trim() && 
                     isValidPhone(clientPhone);

  const handleStaffAssignmentsChange = (assignments: ServiceStaffAssignment[]) => {
    setStaffAssignments(assignments);
  };

  const handleConfirm = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      toast({
        title: t("common.error"),
        description: t("booking.validationError") || "Por favor completa todos los campos requeridos correctamente",
        variant: "destructive",
      });
      return;
    }

    if (!canConfirm || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    const selectedSlot = timeSlots.find((s) => s.id === selectedTime);

    if (!selectedSlot) {
      setIsSubmitting(false);
      toast({
        title: t("common.error"),
        description: "Selecciona un horario válido.",
        variant: "destructive",
      });
      return;
    }

    // Strong double-check against DB right before insert to avoid double-booking.
    // This does NOT replace backend constraints, but prevents most client-side races.
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const establishmentId = establishment?.id || id;

      const { data: existing } = await supabase
        .from("appointments")
        .select("staff_id, start_time, end_time, duration_minutes, status")
        .eq("business_id", establishmentId)
        .eq("date", dateStr)
        // CRITICAL: Only check conflicts with active appointments (pending, confirmed, arrived, started)
        // Completed appointments should NOT block new bookings
        // Cancelled appointments are excluded (not in this list)
        .in("status", ["pending", "confirmed", "arrived", "started"]);

      const startMin = parseTimeToMinutes(selectedSlot.time);
      const endMin = startMin + selectedDurationMinutes;

      const overlapsExisting = (row: any) => {
        if (!row?.start_time) return false;
        const rStart = parseTimeToMinutes(row.start_time);
        const rEnd = row.end_time ? parseTimeToMinutes(row.end_time) : rStart + (row.duration_minutes || 30);
        return overlaps(startMin, endMin, rStart, rEnd);
      };

      const staffIdToCheck =
        !hasExplicitStaff
          ? null
          : staffMembers.length === 1
          ? staffMembers[0].id
          : staffAssignments[0]?.staffId || null;

      const conflict = ((existing as any[]) || []).some((row) => {
        // Owner-only / no staff: any overlap blocks.
        if (!hasExplicitStaff) return overlapsExisting(row);

        // One staff: any overlap blocks.
        if (staffMembers.length === 1) return overlapsExisting(row);

        // Multi staff: check overlaps for selected staff AND any unassigned booking (safety)
        if (!staffIdToCheck) return overlapsExisting(row); // if no staff chosen yet, be conservative
        if (row.staff_id == null) return overlapsExisting(row);
        if (row.staff_id === staffIdToCheck) return overlapsExisting(row);
        return false;
      });

      if (conflict) {
        setIsSubmitting(false);
        toast({
          title: t("common.error"),
          description: "Ese horario ya fue reservado. Selecciona otro.",
          variant: "destructive",
        });
        await fetchDayAppointments();
        return;
      }
    } catch (e) {
      console.error("Pre-insert availability check failed:", e);
      // Continue — backend constraints (recommended) should be the final guard.
    }

    try {
      const establishmentId = establishment?.id || id || "";
      const primaryStaff = staffAssignments[0]?.staffId || undefined;
      
      const { error: createError } = await createAppointment({
        establishment_id: establishmentId,
        staff_id: primaryStaff,
        client_name: clientName,
        client_email: clientEmail || undefined,
        client_phone: clientPhone || undefined,
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedSlot?.time || "09:00",
        price: totalPrice,
        duration_minutes: totalDuration,
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration_minutes: s.duration,
        })),
      });

      if (createError) {
        console.error("Error saving appointment:", createError);
        toast({
          title: t("common.error"),
          description: createError.includes("exclusion") || createError.includes("overlap")
            ? "Ese horario ya fue reservado. Selecciona otro."
            : "No se pudo crear la reserva. Intenta de nuevo.",
          variant: "destructive",
        });
        await fetchDayAppointments();
        return;
      }

      toast({
        title: t("booking.bookingConfirmed"),
        description: `${t("booking.bookingConfirmedDesc")} ${establishmentName} - ${format(selectedDate, "PPP", { locale: es })} ${selectedSlot?.time}`,
      });

      // CRITICAL: Refresh appointments cache immediately after creating appointment
      // This ensures the time slot is blocked immediately for other users, even before confirmation
      // The realtime subscription will also trigger, but this immediate refresh is critical for UX
      await fetchDayAppointments();

      // Small delay to ensure state updates before navigation
      setTimeout(() => {
        navigate("/appointments");
      }, 100);
    } catch (err) {
      console.error("Error:", err);
      toast({
        title: t("common.error"),
        description: "No se pudo crear la reserva. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>
    );
  }

  // Error state
  if (error || !establishment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-xl font-bold text-foreground mb-2">{t("common.error")}</h2>
          <p className="text-muted-foreground mb-4">{t("business.notFound")}</p>
          <Button variant="coral" onClick={() => navigate("/")}>
            {t("common.goBack")}
          </Button>
        </div>
      </div>
    );
  }

  // No services selected
  if (services.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-xl font-bold text-foreground mb-2">{t("booking.noServices")}</h2>
          <p className="text-muted-foreground mb-4">{t("booking.selectServicesFirst")}</p>
          <Button variant="coral" onClick={() => navigate(`/business/${id}`)}>
            {t("common.goBack")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Link to={`/business/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-foreground">{t("booking.title")}</h1>
            <p className="text-xs text-muted-foreground">{establishmentName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Services Summary */}
        <section className="animate-fade-in">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("booking.selectedServices")}
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-foreground">{service.name}</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {service.duration} {t("booking.min")}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between">
              <span className="font-medium text-foreground">{t("booking.total")}</span>
              <span className="font-bold text-foreground">
                RD$ {totalPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Client Info */}
        <section className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("booking.yourData")}
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">{t("booking.name")} *</Label>
              <Input
                id="clientName"
                placeholder={t("booking.namePlaceholder")}
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (nameError) setNameError(""); // Clear error when user types
                }}
                className={nameError ? "border-destructive" : ""}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">{t("booking.phone")} *</Label>
              <Input
                id="clientPhone"
                type="tel"
                placeholder="+1 809 555 1234"
                value={clientPhone}
                onChange={(e) => {
                  setClientPhone(e.target.value);
                  if (phoneError) setPhoneError(""); // Clear error when user types
                }}
                className={phoneError ? "border-destructive" : ""}
                maxLength={20}
              />
              {phoneError && (
                <p className="text-sm text-destructive">{phoneError}</p>
              )}
              {!phoneError && clientPhone && (
                <p className="text-xs text-muted-foreground">
                  {countDigits(clientPhone)} dígitos {countDigits(clientPhone) < 9 || countDigits(clientPhone) > 14 ? "(requiere 9-14)" : ""}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">{t("booking.email")}</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="tu@email.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Staff Selection */}
        {staffMembers.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              {services.length > 1 
                ? t("booking.assignProfessionals") 
                : t("booking.selectProfessional")}
            </h2>
            <div className="bg-card rounded-xl border border-border p-4">
              <MultiStaffSelection
                services={services}
                staffMembers={staffMembers}
                onAssignmentsChange={handleStaffAssignmentsChange}
              />
            </div>
          </section>
        )}

        {/* Date Selection */}
        <section className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t("booking.selectDate")}
          </h2>
          <div className="bg-card rounded-xl border border-border p-4">
            <DatePicker selected={selectedDate} onSelect={setSelectedDate} />
          </div>
        </section>

        {/* Time Selection */}
        {selectedDate && (
          <section className="animate-fade-in">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t("booking.availableTimes")}
            </h2>
            <div className="bg-card rounded-xl border border-border p-4">
              {isClosed ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-lg font-medium text-foreground">{t("booking.closedTitle")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("booking.closedMessage")}</p>
                </div>
              ) : (
                <TimeSlotPicker
                  slots={timeSlots}
                  selected={selectedTime}
                  onSelect={setSelectedTime}
                />
              )}
            </div>
          </section>
        )}

        {/* Payment Info */}
        <section className="animate-fade-in bg-info/10 rounded-xl p-4">
          <p className="text-sm text-info font-medium">{t("booking.paymentInfo")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("booking.paymentNote")}
          </p>
        </section>
      </main>

      {/* Confirm Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-elevated z-50">
        <div className="max-w-lg mx-auto">
          <Button
            variant="coral"
            size="xl"
            className="w-full"
            disabled={!canConfirm || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? t("booking.confirming") : t("booking.confirmBooking")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;