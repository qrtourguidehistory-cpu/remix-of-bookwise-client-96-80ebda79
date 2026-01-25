import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Business = Tables<"businesses">;
export type Service = Tables<"services">;
export type Staff = Tables<"staff">;
export type PaymentMethod = Tables<"payment_methods">;

// Unified type that works with both tables
export interface UnifiedEstablishment {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  rating: number;
  review_count: number;
  main_image: string | null; // Deprecated: usar logo_url y cover_image_url
  logo_url: string | null; // Imagen de perfil (circular pequeña)
  cover_image_url: string | null; // Imagen de portada (principal)
  category: string | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
  slug: string | null;
  is_public?: boolean;
  is_active?: boolean;
  temporarily_closed?: boolean | null;
  closed_until?: string | null;
  google_maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// Cache for establishments data
let establishmentsCache: UnifiedEstablishment[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useEstablishments() {
  const [establishments, setEstablishments] = useState<UnifiedEstablishment[]>(establishmentsCache || []);
  const [loading, setLoading] = useState(!establishmentsCache);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(!establishmentsCache);

  const fetchEstablishments = useCallback(async (forceRefresh = false, isRealtimeRefresh = false) => {
    // Use cache if available and not expired
    const now = Date.now();
    if (!forceRefresh && establishmentsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      setEstablishments(establishmentsCache);
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    // Para refreshes realtime, no mostrar loading ni limpiar error si hay datos previos
    // Usar cache como fuente de verdad para evitar dependencias del estado
    const hasExistingData = establishmentsCache !== null && establishmentsCache.length > 0;
    
    try {
      // Solo setear loading si es el fetch inicial o no hay datos previos
      if (!isRealtimeRefresh || !hasExistingData) {
        setLoading(true);
      }
      
      // Solo limpiar error en fetch inicial, no en refreshes realtime
      if (!isRealtimeRefresh) {
        setError(null);
      }
      
      // Optimized query: only select needed columns (incluye secondary_categories, temporarily_closed, closed_until, google_maps_url, latitude, longitude)
      const { data: businessesData, error: businessesError } = await supabase
        .from("businesses")
        .select("id, business_name, description, address, phone, email, average_rating, total_reviews, logo_url, cover_image_url, primary_category, category, secondary_categories, slug, is_public, is_active, temporarily_closed, closed_until, google_maps_url, latitude, longitude, created_at")
        .eq("is_public", true)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .limit(100); // Limit to prevent huge queries

      if (businessesError) {
        console.error("Error fetching businesses:", businessesError);
        throw businessesError;
      }

      // Normalize data from businesses table
      const normalizedBusinesses: UnifiedEstablishment[] = (businessesData || []).map((b) => ({
        id: b.id,
        name: b.business_name || "Sin nombre",
        description: b.description,
        address: b.address,
        phone: b.phone,
        email: b.email,
        rating: 4.5, // Hardcoded rating for all establishments
        review_count: b.total_reviews || 0,
        main_image: b.logo_url || b.cover_image_url, // Deprecated: mantener para compatibilidad
        logo_url: b.logo_url ?? null, // Imagen de perfil (circular pequeña)
        cover_image_url: b.cover_image_url ?? null, // Imagen de portada (principal)
        category: b.primary_category || b.category,
        primary_category: b.primary_category,
        secondary_categories: b.secondary_categories || [],
        slug: b.slug,
        is_public: b.is_public ?? true,
        is_active: b.is_active ?? true,
        temporarily_closed: b.temporarily_closed ?? false,
        closed_until: b.closed_until ?? null,
        google_maps_url: b.google_maps_url ?? null,
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
      }));

      // Update cache
      establishmentsCache = normalizedBusinesses;
      cacheTimestamp = now;
      setEstablishments(normalizedBusinesses);
      setIsInitialLoad(false);
    } catch (err: any) {
      // CRÍTICO: Solo setear error si es el fetch inicial
      // Si es un refresh realtime, mantener los datos anteriores y no romper la UI
      if (!isRealtimeRefresh) {
        setError(err.message);
        console.error("Error fetching establishments (initial load):", err);
      } else {
        // Para refreshes realtime, solo loguear el error pero no romper la UI
        console.warn("Error en refresh realtime de establishments (manteniendo datos anteriores):", err);
        // No setear error, mantener datos anteriores
      }
    } finally {
      // Solo setear loading en false si no es un refresh realtime con datos existentes
      if (!isRealtimeRefresh || !hasExistingData) {
        setLoading(false);
      }
    }
    // No incluir dependencias - el callback usa el cache global y el estado se lee en tiempo de ejecución
  }, []);

  useEffect(() => {
    fetchEstablishments();
  }, [fetchEstablishments]);

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryAttempts = 0;
    const MAX_RETRY_ATTEMPTS = 3;
    
    const handleRealtimeChange = (payload: any) => {
      console.log("Businesses changed via Realtime:", payload);
      
      // Reset retry attempts on successful event
      retryAttempts = 0;
      
      // Intentar refresh con retry logic
      const attemptRefresh = async (attempt: number = 0) => {
        try {
          await fetchEstablishments(true, true); // forceRefresh = true, isRealtimeRefresh = true
        } catch (err) {
          // Si falla y aún tenemos intentos, reintentar con exponential backoff
          if (attempt < MAX_RETRY_ATTEMPTS) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
            console.warn(`Realtime refresh falló, reintentando en ${delay}ms (intento ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
            retryTimeout = setTimeout(() => {
              attemptRefresh(attempt + 1);
            }, delay);
          } else {
            console.error("Máximo de intentos alcanzado para refresh realtime, manteniendo datos anteriores");
          }
        }
      };
      
      attemptRefresh();
    };
    
    const channel = supabase
      .channel(`public-businesses-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "businesses" },
        handleRealtimeChange
      )
      .subscribe((status) => {
        console.log("[Realtime] Businesses subscription status:", status);
        if (status === "SUBSCRIBED") {
          retryAttempts = 0; // Reset on successful subscription
        }
      });

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchEstablishments]);

  return {
    establishments,
    loading,
    error,
    refetch: fetchEstablishments,
  };
}

export function useEstablishment(id: string | undefined) {
  const [establishment, setEstablishment] = useState<UnifiedEstablishment | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEstablishment = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Transform services to include price_rd and price_usd (same logic as appointments)
      // Define this function outside blocks so it can be reused
      const transformService = (s: any) => {
        const serviceCurrency = s.price_currency || "DOP";
        const servicePriceBase = Number(s.price || 0);
        
        // Read price_usd DIRECTLY from database column
        // Supabase returns numeric fields as strings, so convert to number
        // IMPORTANT: Read directly from s.price_usd column (no conversions, just display what's in DB)
        let servicePriceUsd = 0;
        // Check if price_usd exists and convert to number
        // Handle both null, undefined, empty string, and valid numeric values (string or number)
        if (s.price_usd != null && s.price_usd !== undefined) {
          const priceUsdStr = String(s.price_usd).trim();
          if (priceUsdStr !== '' && priceUsdStr !== 'null' && priceUsdStr !== 'undefined') {
            // Convert to number - handle both string and number types from Supabase
            const parsed = parseFloat(priceUsdStr);
            if (!isNaN(parsed) && isFinite(parsed)) {
              servicePriceUsd = parsed;
            }
          }
        }
        
        let priceRD = 0;
        let priceUSD = 0;
        
        // Use prices DIRECTLY from database columns (NO conversions)
        // Column structure in services table:
        // - price: precio en la moneda base (DOP o USD según price_currency)
        // - price_usd: precio en USD (configurado por Partner app)
        if (serviceCurrency === "USD" || serviceCurrency === "$") {
          // Base currency is USD
          // services.price = precio en USD
          // services.price_usd = precio en RD$ (si está configurado)
          priceUSD = servicePriceBase;
          priceRD = servicePriceUsd;
        } else {
          // Base currency is DOP/RD$ (default)
          // services.price = precio en RD$
          // services.price_usd = precio en USD (configurado por Partner app)
          priceRD = servicePriceBase;
          priceUSD = servicePriceUsd;
        }
        
        // Return transformed service
        // IMPORTANT: Set price_rd and price_usd AFTER spread to ensure they override any existing values
        const transformed: any = {
          ...s,
          duration: s.duration_minutes || s.duration || 30,
          price: servicePriceBase,
          price_currency: serviceCurrency,
          currency: serviceCurrency,
        };
        
        // Explicitly set price_rd and price_usd to ensure they're not overwritten
        // Convert to number to ensure type consistency
        transformed.price_rd = Number(priceRD) || 0;
        transformed.price_usd = Number(priceUSD) || 0;
        
        return transformed;
      };
      
      // Try fetching from businesses table first (Partner app data)
      // CRITICAL: Include temporarily_closed and closed_until in select
      // Using explicit select to ensure fields are included
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (businessError) {
        console.error("Error fetching business:", businessError);
        throw businessError;
      }

      if (businessData) {
        const mappedEstablishment = {
          id: businessData.id,
          name: businessData.business_name || "Sin nombre",
          description: businessData.description,
          address: businessData.address,
          phone: businessData.phone,
          email: businessData.email,
          rating: 4.5, // Hardcoded rating for all establishments
          review_count: businessData.total_reviews || 0,
          main_image: businessData.logo_url || businessData.cover_image_url, // Deprecated: mantener para compatibilidad
          logo_url: businessData.logo_url ?? null, // Imagen de perfil (circular pequeña)
          cover_image_url: businessData.cover_image_url ?? null, // Imagen de portada (principal)
          category: businessData.primary_category || businessData.category,
          primary_category: businessData.primary_category,
          secondary_categories: businessData.secondary_categories || [],
          slug: businessData.slug,
          is_public: businessData.is_public ?? true,
          is_active: businessData.is_active ?? true,
          temporarily_closed: businessData.temporarily_closed ?? false,
          closed_until: businessData.closed_until ?? null,
          google_maps_url: businessData.google_maps_url ?? null,
          latitude: businessData.latitude ?? null,
          longitude: businessData.longitude ?? null,
        };
        
        setEstablishment(mappedEstablishment);

        // Fetch services for this business from both tables
        const [servicesResult, businessServicesResult, staffResult, paymentResult] = await Promise.all([
          supabase
            .from("services")
            .select("*")
            .eq("business_id", id)
            .eq("is_active", true)
            .order("display_order", { nullsFirst: false })
            .order("name", { ascending: true }),
          supabase
            .from("business_services")
            .select("*")
            .eq("business_id", id)
            .eq("is_active", true),
          supabase
            .from("staff")
            .select("*")
            .eq("business_id", id)
            .eq("is_active", true),
          supabase
            .from("payment_methods")
            .select("*")
            .eq("business_id", id)
            .eq("is_active", true),
        ]);
        
        // Check for errors
        if (servicesResult.error) {
          console.error("Error fetching services:", servicesResult.error);
        }
        if (businessServicesResult.error) {
          console.error("Error fetching business_services:", businessServicesResult.error);
        }
        
        // Combine services from both tables
        // Remove duplicates by id (in case same service exists in both tables)
        const servicesMap = new Map<string, Service>();
        
        // Process services from services table
        (servicesResult.data || []).forEach((s: any) => {
          const transformed = transformService(s);
          servicesMap.set(transformed.id, transformed);
        });
        
        // Process services from business_services table (if any)
        (businessServicesResult.data || []).forEach((bs: any) => {
          const transformed = transformService({
            ...bs,
            duration_minutes: bs.duration_minutes || 30,
          });
          // Only add if not already in map (prefer services table data)
          if (!servicesMap.has(transformed.id)) {
            servicesMap.set(transformed.id, transformed);
          }
        });
        
        // Sort services by display_order (if available) and then by name
        const allServices = Array.from(servicesMap.values()).sort((a, b) => {
          const aOrder = (a as any).display_order ?? 999;
          const bOrder = (b as any).display_order ?? 999;
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          return (a.name || '').localeCompare(b.name || '');
        });

        setServices(allServices);
        setStaff((staffResult.data as Staff[]) || []);
        setPaymentMethods((paymentResult.data as PaymentMethod[]) || []);
      } else {
        // Business not found
        setError("Establecimiento no encontrado");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching establishment:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setEstablishment(null);
      setServices([]);
      setStaff([]);
      setPaymentMethods([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchEstablishment();

    // CRITICAL: Subscribe to realtime changes for businesses table
    // This ensures immediate updates when temporarily_closed or closed_until changes
    const businessChannel = supabase
      .channel(`business-${id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "businesses",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("🔄 Business data changed via Realtime:", payload);
          const updatedData = payload.new as any;
          
          // Update establishment state immediately with new data
          if (updatedData) {
            setEstablishment((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                name: updatedData.business_name || prev.name,
                description: updatedData.description ?? prev.description,
                address: updatedData.address ?? prev.address,
                phone: updatedData.phone ?? prev.phone,
                email: updatedData.email ?? prev.email,
                rating: Number(updatedData.average_rating) || prev.rating,
                review_count: updatedData.total_reviews ?? prev.review_count,
                main_image: updatedData.logo_url || updatedData.cover_image_url || prev.main_image, // Deprecated
                logo_url: updatedData.logo_url ?? prev.logo_url,
                cover_image_url: updatedData.cover_image_url ?? prev.cover_image_url,
                category: updatedData.primary_category || updatedData.category || prev.category,
                primary_category: updatedData.primary_category ?? prev.primary_category,
                secondary_categories: updatedData.secondary_categories ?? prev.secondary_categories,
                is_active: updatedData.is_active ?? prev.is_active,
                is_public: updatedData.is_public ?? prev.is_public,
                // CRITICAL: Update closure status immediately
                temporarily_closed: updatedData.temporarily_closed ?? false,
                closed_until: updatedData.closed_until ?? null,
                latitude: updatedData.latitude ?? prev.latitude,
                longitude: updatedData.longitude ?? prev.longitude,
              };
            });
          }
          
          // Also refetch to ensure all data is in sync
          fetchEstablishment();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for services
    const servicesChannel = supabase
      .channel(`services-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "services",
          filter: `business_id=eq.${id}`,
        },
        (payload) => {
          console.log("Services changed:", payload);
          // Refetch establishment data (includes services)
          fetchEstablishment();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for staff
    const staffChannel = supabase
      .channel(`staff-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "staff",
          filter: `business_id=eq.${id}`,
        },
        (payload) => {
          console.log("Staff changed:", payload);
          // Refetch establishment data (includes staff)
          fetchEstablishment();
        }
      )
      .subscribe();

    // Refetch on window focus to ensure fresh data
    const handleFocus = () => {
      fetchEstablishment();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchEstablishment();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(businessChannel);
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(staffChannel);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, fetchEstablishment]);

  return {
    establishment,
    services,
    staff,
    paymentMethods,
    loading,
    error,
    refetch: fetchEstablishment,
  };
}
