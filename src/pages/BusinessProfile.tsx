import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, Phone, Share2, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceItem, Service } from "@/components/business/ServiceItem";
import { ImageCarousel } from "@/components/business/ImageCarousel";
import { useEstablishment } from "@/hooks/useEstablishments";
import { useFavorites } from "@/hooks/useFavorites";
import { useDBBusinessHours, getDefaultBusinessHours } from "@/hooks/useBusinessHours";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BusinessProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isGuest } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const { establishment, services: dbServices, paymentMethods, loading, error, refetch } = useEstablishment(id);
  const { hours: dbHours } = useDBBusinessHours(id);

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  // Check if business is temporarily closed
  // This checks both the flag and if closed_until has passed
  const isTemporarilyClosed = useMemo(() => {
    if (!establishment) return false;
    if (!establishment.temporarily_closed) return false;
    if (!establishment.closed_until) return establishment.temporarily_closed;
    
    const closedUntilDate = new Date(establishment.closed_until);
    const now = new Date();
    // Business is closed if flag is true AND closed_until hasn't passed
    return establishment.temporarily_closed === true && closedUntilDate > now;
  }, [establishment]);

  // Timer to automatically check if closed_until has passed
  // This ensures the banner disappears even if Realtime doesn't fire
  useEffect(() => {
    if (!establishment?.temporarily_closed || !establishment?.closed_until) {
      return;
    }

    const closedUntilDate = new Date(establishment.closed_until);
    const now = new Date();
    
    // If already past, no need for timer
    if (closedUntilDate <= now) {
      return;
    }

    // Calculate milliseconds until reopening
    const msUntilReopen = closedUntilDate.getTime() - now.getTime();
    
    // Set timer to check when closed_until passes
    const timer = setTimeout(() => {
      // Refetch to get latest data
      refetch();
    }, msUntilReopen + 1000); // Add 1 second buffer

    return () => clearTimeout(timer);
  }, [establishment?.closed_until, establishment?.temporarily_closed, refetch]);

  // Periodic check every 30 seconds to ensure we catch any time drift
  useEffect(() => {
    if (!establishment?.temporarily_closed || !establishment?.closed_until) {
      return;
    }

    const interval = setInterval(() => {
      const closedUntilDate = new Date(establishment.closed_until!);
      const now = new Date();
      
      // If closed_until has passed, refetch to update state
      if (closedUntilDate <= now) {
        refetch();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [establishment?.closed_until, establishment?.temporarily_closed, refetch]);

  // Get reopening time if temporarily closed
  const reopeningTime = useMemo(() => {
    if (!isTemporarilyClosed || !establishment?.closed_until) return null;
    try {
      const closedUntilDate = new Date(establishment.closed_until);
      return format(closedUntilDate, "HH:mm");
    } catch {
      return null;
    }
  }, [isTemporarilyClosed, establishment?.closed_until]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartY.current || !touchEndY.current) return;
    
    const distance = touchStartY.current - touchEndY.current;
    const isPullDown = distance < -50; // Pull down more than 50px
    
    if (isPullDown && window.scrollY === 0) {
      handleRefresh();
    }
    
    touchStartY.current = null;
    touchEndY.current = null;
  };

  // Calculate if currently open based on business hours - MOVED BEFORE EARLY RETURNS
  // If temporarily closed, always return false
  const isOpenNow = useMemo(() => {
    // If temporarily closed, business is not open
    if (isTemporarilyClosed) return false;
    
    const now = new Date();
    const hours = dbHours || getDefaultBusinessHours(id);
    
    const parseTime = (time: string): number => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = parseTime(hours.openTime);
    const closeMinutes = parseTime(hours.closeTime);
    
    // Check if within lunch break
    if (hours.lunchStart && hours.lunchEnd) {
      const lunchStartMinutes = parseTime(hours.lunchStart);
      const lunchEndMinutes = parseTime(hours.lunchEnd);
      if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
        return false;
      }
    }
    
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }, [dbHours, id, isTemporarilyClosed]);

  const handleServiceSelect = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const handleToggleFavorite = async () => {
    if (isGuest || !user) {
      toast({
        title: t("common.loginRequired"),
        description: t("favorites.loginToSave"),
        variant: "destructive",
      });
      return;
    }
    if (id) {
      await toggleFavorite(id);
    }
  };

  const totalPriceRD = selectedServices.reduce((sum, s) => sum + (s.price_rd || s.price || 0), 0);
  const totalPriceUSD = selectedServices.reduce((sum, s) => sum + (s.price_usd || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  const handlePhoneClick = () => {
    const phone = establishment?.phone || "";
    if (phone) {
      window.location.href = `tel:${phone.replace(/\s/g, "")}`;
    }
  };

  const handleAddressClick = () => {
    const address = establishment?.address || "";
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-56 bg-gradient-to-br from-secondary to-muted">
          <Skeleton className="w-full h-full" />
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
            <Button variant="secondary" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 -mt-8 relative z-10">
          <div className="bg-card rounded-2xl shadow-card p-5">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error or not found state
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

  // Transform DB services to component format
  // Preserve all price fields (price_rd, price_usd) from transformed services
  // Note: dbServices already comes transformed from useEstablishment hook with price_rd and price_usd
  console.log("BusinessProfile - dbServices received:", dbServices.length, dbServices.map(s => ({ id: s.id, name: s.name })));
  
  const services: Service[] = dbServices.map(s => {
    // Use the transformed price_rd and price_usd if available, otherwise calculate
    const priceRD = (s as any).price_rd !== undefined 
      ? Number((s as any).price_rd) 
      : Number(s.price || 0);
    const priceUSD = (s as any).price_usd !== undefined 
      ? Number((s as any).price_usd) 
      : 0;
    
    return {
      id: s.id,
      name: s.name,
      description: s.description || "",
      duration: (s as any).duration_minutes || 30,
      price: Number(s.price || 0),
      price_rd: priceRD,
      price_usd: priceUSD,
      price_currency: s.price_currency || "DOP",
      currency: s.price_currency || "DOP",
    };
  });

  // Get images
  const images = establishment.main_image ? [establishment.main_image] : [];

  const isCurrentFavorite = id ? isFavorite(id) : false;

  return (
    <div 
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hero Section with Image Carousel */}
      <div className="relative h-56 bg-gradient-to-br from-secondary to-muted">
        {images.length > 0 ? (
          <ImageCarousel images={images} alt={establishment.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground">{t("business.noImage")}</span>
          </div>
        )}

        {/* Top Actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <Link to="/">
            <Button variant="secondary" size="icon" className="rounded-full shadow-card">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full shadow-card"
              onClick={() => {
                const url = window.location.href;
                const text = `Check out ${establishment.name}!`;
                if (navigator.share) {
                  navigator.share({ title: establishment.name, text, url });
                } else {
                  navigator.clipboard.writeText(url);
                  toast({ title: t("common.linkCopied") });
                }
              }}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-card"
              onClick={handleToggleFavorite}
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-colors",
                  isCurrentFavorite && "fill-primary text-primary"
                )}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "max-w-lg mx-auto px-4 -mt-8 relative z-10",
        selectedServices.length > 0 ? "pb-36" : "pb-8"
      )}>
        <div className="bg-card rounded-2xl shadow-card p-5 animate-slide-up">
          <h1 className="text-xl font-bold text-foreground mb-2">{establishment.name}</h1>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <span className="font-semibold text-foreground">
                {establishment.rating || 0}
              </span>
              <span className="text-muted-foreground text-sm">
                ({establishment.review_count || 0} {t("business.reviews")})
              </span>
            </div>
            {establishment.address && (
              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-gray-700" strokeWidth={2} />
                {establishment.address}
              </span>
            )}
          </div>

          {establishment.description && (
            <p className="text-muted-foreground text-sm mb-4">
              {establishment.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm">
            {isTemporarilyClosed ? (
              <div className="flex flex-col gap-1 w-full bg-warning/10 p-3 rounded-lg border border-warning/20 animate-fade-in">
                <span className="flex items-center gap-1.5 text-destructive font-semibold">
                  <Clock className="w-4 h-4" strokeWidth={2} />
                  {t("business.temporarilyClosed")}
                </span>
                {reopeningTime && (
                  <span className="text-muted-foreground text-xs">
                    {t("business.reopensAt")} {reopeningTime}
                  </span>
                )}
              </div>
            ) : (
              <span className={cn(
                "flex items-center gap-1.5",
                isOpenNow ? "text-success" : "text-destructive"
              )}>
                <Clock className="w-4 h-4 text-gray-700" strokeWidth={2} />
                {isOpenNow ? t("business.openNow") : t("business.closedNow")}
              </span>
            )}
          </div>
        </div>

        {/* Services Section */}
        <section className="mt-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-bold text-foreground mb-4">{t("business.services")}</h2>
          {services.length > 0 ? (
            <div className="space-y-3">
              {services.map((service) => (
                <ServiceItem
                  key={service.id}
                  service={service}
                  onSelect={handleServiceSelect}
                  selected={selectedServices.some((s) => s.id === service.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-muted-foreground">{t("business.noServices")}</p>
            </div>
          )}
        </section>

        {/* Contact Section */}
        {(establishment.phone || establishment.address) && (
          <section className="mt-6 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="text-lg font-bold text-foreground mb-4">{t("business.contact")}</h2>
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              {establishment.phone && (
                <button
                  onClick={handlePhoneClick}
                  className="w-full flex items-center gap-3 hover:bg-secondary/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-700" strokeWidth={2} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm text-muted-foreground">{t("business.phone")}</p>
                    <p className="font-medium text-foreground">{establishment.phone}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-500" strokeWidth={2} />
                </button>
              )}
              {establishment.address && (
                <button
                  onClick={handleAddressClick}
                  className="w-full flex items-center gap-3 hover:bg-secondary/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-gray-700" strokeWidth={2} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm text-muted-foreground">{t("business.address")}</p>
                    <p className="font-medium text-foreground">{establishment.address}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-500" strokeWidth={2} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* Payment Methods Info */}
        <section className="mt-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-lg font-bold text-foreground mb-4">{t("business.paymentMethods")}</h2>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground mb-3">
              {t("business.paymentMethodsDesc")}
            </p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <span 
                    key={method.id}
                    className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
                  >
                    {method.name}
                  </span>
                ))
              ) : (
                <>
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                    {t("business.cash")}
                  </span>
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                    {t("business.creditCard")}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Cancellation Policy */}
        <section className="mt-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-lg font-bold text-foreground mb-4">{t("business.cancellationPolicy")}</h2>
          <div className="bg-warning/10 rounded-xl border border-warning/20 p-4">
            <p className="text-sm text-foreground">
              {t("business.cancellationPolicyText")} <strong>{t("business.cancellationHours")}</strong>.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t("business.cancellationNote")}
            </p>
          </div>
        </section>
      </div>

      {/* Booking Footer */}
      {selectedServices.length > 0 && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-elevated z-50 animate-slide-up"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedServices.length} {t("business.services_count")} • {totalDuration} {t("business.min")}
                </p>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    RD$ {totalPriceRD.toLocaleString()}
                  </p>
                  {totalPriceUSD > 0 && (
                    <p className="text-sm text-muted-foreground">
                      USD ${totalPriceUSD.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {isTemporarilyClosed ? (
              <Button variant="coral" size="xl" className="w-full" disabled>
                {t("business.temporarilyClosed")}
              </Button>
            ) : (
              <Link to={`/booking/${id}`} state={{ services: selectedServices }}>
                <Button variant="coral" size="xl" className="w-full">
                  {t("business.continueBooking")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProfile;