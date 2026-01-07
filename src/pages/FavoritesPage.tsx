import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { BusinessCard, Business } from "@/components/business/BusinessCard";
import { useEstablishments } from "@/hooks/useEstablishments";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isGuest } = useAuth();
  
  // Load real data from Supabase
  const { establishments, loading: loadingEstablishments } = useEstablishments();
  const { favoriteIds, loading: loadingFavorites, toggleFavorite, isFavorite } = useFavorites();

  // Convert establishments to Business format and filter favorites
  const allBusinesses: Business[] = establishments.map((est) => ({
    id: est.id,
    name: est.name,
    description: est.description || "",
    rating: Number(est.rating) || 0,
    reviewCount: est.review_count || 0,
    distance: "N/A",
    category: "other",
    imageUrl: est.main_image || "",
    images: est.main_image ? [est.main_image] : [],
    isFavorite: isFavorite(est.id),
    closingTime: "8:00 PM",
  }));

  // Filter only favorites
  const favorites = allBusinesses.filter((b) => favoriteIds.has(b.id));

  const handleToggleFavorite = async (id: string) => {
    if (!user) {
      toast({
        title: t("common.error"),
        description: "Debes iniciar sesión para gestionar favoritos",
        variant: "destructive",
      });
      return;
    }

    const { error } = await toggleFavorite(id);
    if (error) {
      toast({
        title: t("common.error"),
        description: "No se pudo actualizar favoritos",
        variant: "destructive",
      });
    }
  };

  const loading = loadingEstablishments || loadingFavorites;

  // Show login prompt for guests
  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-foreground">{t("favorites.title")}</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-coral-light flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-coral" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("favorites.loginRequired")}
            </h2>
            <p className="text-muted-foreground mb-6">
              Inicia sesión para ver y guardar tus establecimientos favoritos
            </p>
            <Button variant="coral" onClick={() => navigate("/auth")}>
              {t("common.login")}
            </Button>
          </div>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">{t("favorites.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {favorites.length > 0 ? (
          <div className="space-y-4">
            {favorites.map((business, index) => (
              <div
                key={business.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <BusinessCard
                  business={business}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-coral-light flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-coral" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("favorites.noFavorites")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("favorites.noFavoritesDescription")}
            </p>
            <Button variant="coral" onClick={() => navigate("/search")}>
              {t("favorites.explorePlaces")}
            </Button>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default FavoritesPage;
