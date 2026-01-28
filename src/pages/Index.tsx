import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { CategorySection } from "@/components/home/CategorySection";
import { BusinessCompact } from "@/components/business/BusinessCardCompact";
import { useEstablishmentsQuery } from "@/hooks/useEstablishmentsQuery";
import { useFavorites } from "@/hooks/useFavorites";
import { Map, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePreventDuplicateCalls } from "@/hooks/useDebounce";

// Category display names
const categoryNames: Record<string, string> = {
  barberia: "Barbería",
  barber: "Barbería",
  salon: "Salón de Belleza",
  "hair-salon": "Salón de Belleza",
  spa: "Spa & Bienestar",
  "spa-sauna": "Spa & Bienestar",
  nails: "Uñas",
  beauty: "Belleza",
  "beauty-salon": "Belleza",
  massage: "Masajes",
  medspa: "Med Spa",
  general: "Establecimientos",
  other: "Otros",
};

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isGuest } = useAuth();

  // Load real data from Supabase con TanStack Query (optimizado)
  const { data: establishments = [], isLoading: loading, error } = useEstablishmentsQuery();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Prevenir consultas duplicadas en toggleFavorite
  const safeToggleFavorite = usePreventDuplicateCalls(toggleFavorite, 500);

  // Convert establishments to BusinessCompact format
  const businesses: BusinessCompact[] = useMemo(() => {
    return establishments.map((est) => {
      // Normalize category: convert underscores to hyphens for translation keys
      const rawCategory = est.category || est.primary_category || "general";
      const normalizedCategory = rawCategory.replace(/_/g, "-");
      
      return {
        id: est.id,
        name: est.name,
        rating: est.rating || 0,
        reviewCount: est.review_count || 0,
        address: est.address || undefined,
        category: normalizedCategory,
        imageUrl: est.main_image || "", // Deprecated: mantener para compatibilidad
        coverImageUrl: est.cover_image_url || undefined, // Imagen de portada (principal)
        logoUrl: est.logo_url || undefined, // Imagen de perfil (circular pequeña)
        isFavorite: isFavorite(est.id),
      };
    });
  }, [establishments, isFavorite]);

  // Group businesses by category
  const groupedBusinesses = useMemo(() => {
    const groups: Record<string, BusinessCompact[]> = {};

    businesses.forEach((business) => {
      const category = business.category?.toLowerCase() || "general";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(business);
    });

    return groups;
  }, [businesses]);

  // Get sorted category keys (prioritize categories with more businesses)
  const sortedCategories = useMemo(() => {
    return Object.keys(groupedBusinesses).sort(
      (a, b) => groupedBusinesses[b].length - groupedBusinesses[a].length
    );
  }, [groupedBusinesses]);

  const handleToggleFavorite = async (id: string) => {
    if (!user && !isGuest) {
      toast({
        title: t("common.error"),
        description: "Debes iniciar sesión para guardar favoritos",
        variant: "destructive",
      });
      return;
    }

    if (isGuest) {
      toast({
        title: t("common.error"),
        description: "Los invitados no pueden guardar favoritos. Crea una cuenta.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await safeToggleFavorite(id);
    if (error) {
      toast({
        title: t("common.error"),
        description: "No se pudo actualizar favoritos",
        variant: "destructive",
      });
    }
  };
  
  // Limpiador de estado al desmontar la pantalla
  useEffect(() => {
    return () => {
      // Liberar referencias pesadas cuando se desmonta
      // Las queries de TanStack Query se limpian automáticamente
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Solo mostrar error completo si no hay datos previos (error en carga inicial)
  // Si hay datos previos, mostrar la UI normal y permitir que el usuario continúe
  if (error && businesses.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {t("common.error")}: {error instanceof Error ? error.message : String(error)}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="py-5 space-y-8" style={{ paddingInline: "0", boxSizing: "border-box" }}>
        {/* All Establishments Section */}
        {businesses.length > 0 && (
          <CategorySection
            title={t("home.allEstablishments")}
            businesses={businesses}
            onToggleFavorite={handleToggleFavorite}
            isFirstSection={true}
          />
        )}

        {/* Category Sections */}
        {sortedCategories.map((category) => {
          const categoryBusinesses = groupedBusinesses[category];
          if (categoryBusinesses.length === 0) return null;

          // Skip if it's the same as "all" and there's only one category
          if (sortedCategories.length === 1 && category === "general") return null;

          return (
            <CategorySection
              key={category}
              title={categoryNames[category] || category}
              businesses={categoryBusinesses}
              onToggleFavorite={handleToggleFavorite}
            />
          );
        })}

        {/* Empty State */}
        {businesses.length === 0 && (
          <div className="text-center py-12 px-4 animate-fade-in">
            <p className="text-muted-foreground">{t("common.noResults")}</p>
          </div>
        )}
      </main>

      {/* Map Button */}
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-40"
        style={{
          bottom: 'calc(clamp(4rem, 12vw, 4.5rem) + 2.5rem + 0.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Button
          size="default"
          className="rounded-full shadow-elevated gap-2"
          onClick={() => navigate("/map")}
        >
          <Map className="w-4 h-4" />
          {t("home.map")}
        </Button>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;
