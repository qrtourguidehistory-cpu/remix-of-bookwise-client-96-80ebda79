import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UnifiedEstablishment } from "./useEstablishments";

// Re-exportar el tipo para facilitar su uso
export type { UnifiedEstablishment } from "./useEstablishments";

// Cache key para las queries
export const establishmentKeys = {
  all: ["establishments"] as const,
  lists: () => [...establishmentKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...establishmentKeys.lists(), filters] as const,
  details: () => [...establishmentKeys.all, "detail"] as const,
  detail: (id: string) => [...establishmentKeys.details(), id] as const,
};

/**
 * Hook optimizado con TanStack Query para obtener todos los establecimientos
 * - Cache agresivo (2 minutos staleTime, 30 minutos gcTime)
 * - Select específico de columnas (solo las necesarias)
 * - Prevención de consultas duplicadas
 */
export function useEstablishmentsQuery() {
  return useQuery({
    queryKey: establishmentKeys.lists(),
    queryFn: async (): Promise<UnifiedEstablishment[]> => {
      // Select específico: solo las columnas que necesitamos
      const { data: businessesData, error: businessesError } = await supabase
        .from("businesses")
        .select("id, business_name, description, address, phone, email, average_rating, total_reviews, logo_url, cover_image_url, primary_category, category, secondary_categories, slug, is_public, is_active, temporarily_closed, closed_until, google_maps_url, latitude, longitude, created_at")
        .eq("is_public", true)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false })
        .limit(100); // Limitar para prevenir queries enormes

      if (businessesError) {
        console.error("Error fetching businesses:", businessesError);
        throw businessesError;
      }

      // Normalizar datos
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
        logo_url: b.logo_url ?? null,
        cover_image_url: b.cover_image_url ?? null,
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

      return normalizedBusinesses;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos - datos frescos
    gcTime: 30 * 60 * 1000, // 30 minutos en caché
  });
}

/**
 * Hook optimizado con TanStack Query para obtener un establecimiento específico
 * - Select específico de columnas
 * - Cache compartido con la lista
 */
export function useEstablishmentQuery(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: establishmentKeys.detail(id || ""),
    queryFn: async (): Promise<UnifiedEstablishment | null> => {
      if (!id) return null;

      // Intentar obtener del cache primero
      const cached = queryClient.getQueryData<UnifiedEstablishment[]>(establishmentKeys.lists());
      if (cached) {
        const found = cached.find((est) => est.id === id);
        if (found) {
          return found;
        }
      }

      // Si no está en cache, hacer query específico
      // Select específico: solo las columnas necesarias
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, business_name, description, address, phone, email, average_rating, total_reviews, logo_url, cover_image_url, primary_category, category, secondary_categories, slug, is_public, is_active, temporarily_closed, closed_until, google_maps_url, latitude, longitude")
        .eq("id", id)
        .maybeSingle();

      if (businessError) {
        console.error("Error fetching business:", businessError);
        throw businessError;
      }

      if (!businessData) {
        return null;
      }

      return {
        id: businessData.id,
        name: businessData.business_name || "Sin nombre",
        description: businessData.description,
        address: businessData.address,
        phone: businessData.phone,
        email: businessData.email,
        rating: 4.5,
        review_count: businessData.total_reviews || 0,
        main_image: businessData.logo_url || businessData.cover_image_url,
        logo_url: businessData.logo_url ?? null,
        cover_image_url: businessData.cover_image_url ?? null,
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
    },
    enabled: !!id, // Solo ejecutar si hay id
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
}

