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
  main_image: string | null;
  category: string | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
  slug: string | null;
  is_public?: boolean;
  is_active?: boolean;
  temporarily_closed?: boolean | null;
  closed_until?: string | null;
}

// Cache for establishments data
let establishmentsCache: UnifiedEstablishment[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useEstablishments() {
  const [establishments, setEstablishments] = useState<UnifiedEstablishment[]>(establishmentsCache || []);
  const [loading, setLoading] = useState(!establishmentsCache);
  const [error, setError] = useState<string | null>(null);

  const fetchEstablishments = useCallback(async (forceRefresh = false) => {
    // Use cache if available and not expired
    const now = Date.now();
    if (!forceRefresh && establishmentsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      setEstablishments(establishmentsCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Optimized query: only select needed columns (incluye secondary_categories, temporarily_closed, closed_until)
      const { data: businessesData, error: businessesError } = await supabase
        .from("businesses")
        .select("id, business_name, description, address, phone, email, average_rating, total_reviews, logo_url, cover_image_url, primary_category, category, secondary_categories, slug, is_public, is_active, temporarily_closed, closed_until, created_at")
        .eq("is_public", true)
        .eq("is_active", true)
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
        rating: Number(b.average_rating) || 0,
        review_count: b.total_reviews || 0,
        main_image: b.logo_url || b.cover_image_url,
        category: b.primary_category || b.category,
        primary_category: b.primary_category,
        secondary_categories: b.secondary_categories || [],
        slug: b.slug,
        is_public: b.is_public ?? true,
        is_active: b.is_active ?? true,
        temporarily_closed: b.temporarily_closed ?? false,
        closed_until: b.closed_until ?? null,
      }));

      // Update cache
      establishmentsCache = normalizedBusinesses;
      cacheTimestamp = now;
      setEstablishments(normalizedBusinesses);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching establishments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstablishments();
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
      
      console.log('🔍 useEstablishment - Query result error:', businessError);

      // Log business data for verification
      console.log('🔍 useEstablishment - RAW Business data from DB:', businessData);
      if (businessData) {
        console.log('🔍 useEstablishment - temporarily_closed RAW:', businessData.temporarily_closed, typeof businessData.temporarily_closed);
        console.log('🔍 useEstablishment - closed_until RAW:', businessData.closed_until, typeof businessData.closed_until);
        console.log('🔍 useEstablishment - Current time:', new Date().toISOString());
        if (businessData.temporarily_closed && businessData.closed_until) {
          const closedUntilDate = new Date(businessData.closed_until);
          const now = new Date();
          console.log('🔍 useEstablishment - Is closed?', businessData.temporarily_closed === true && closedUntilDate > now);
        }
      }

      if (businessData) {
        const mappedEstablishment = {
          id: businessData.id,
          name: businessData.business_name || "Sin nombre",
          description: businessData.description,
          address: businessData.address,
          phone: businessData.phone,
          email: businessData.email,
          rating: Number(businessData.average_rating) || 0,
          review_count: businessData.total_reviews || 0,
          main_image: businessData.logo_url || businessData.cover_image_url,
          category: businessData.primary_category || businessData.category,
          primary_category: businessData.primary_category,
          secondary_categories: businessData.secondary_categories || [],
          slug: businessData.slug,
          is_public: businessData.is_public ?? true,
          is_active: businessData.is_active ?? true,
          temporarily_closed: businessData.temporarily_closed ?? false,
          closed_until: businessData.closed_until ?? null,
        };
        
        console.log('🔍 useEstablishment - MAPPED Establishment:', {
          id: mappedEstablishment.id,
          name: mappedEstablishment.name,
          temporarily_closed: mappedEstablishment.temporarily_closed,
          closed_until: mappedEstablishment.closed_until,
          type_temporarily_closed: typeof mappedEstablishment.temporarily_closed,
          type_closed_until: typeof mappedEstablishment.closed_until
        });
        
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
        
        // Debug: Log what we're getting
        console.log("Services result:", {
          data: servicesResult.data,
          error: servicesResult.error,
          count: servicesResult.data?.length || 0,
        });
        
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

        console.log("Services result count:", servicesResult.data?.length || 0);
        console.log("Business services result count:", businessServicesResult.data?.length || 0);
        console.log("All services after transformation (unique):", allServices.length);
        console.log("Service names:", allServices.map(s => s.name));
        console.log("Service IDs:", allServices.map(s => s.id));

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

    return () => {
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(staffChannel);
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
