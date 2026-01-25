import { memo } from "react";
import { Star, MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ImageCarousel } from "./ImageCarousel";

export interface Business {
  id: string;
  name: string;
  description: string;
  descriptionKey?: string;
  rating: number;
  reviewCount: number;
  distance: string;
  category: string;
  imageUrl?: string; // Deprecated: usar coverImageUrl
  images?: string[]; // Deprecated: usar coverImages
  coverImageUrl?: string; // Imagen de portada (principal)
  coverImages?: string[]; // Múltiples imágenes de portada (con scroll)
  logoUrl?: string; // Imagen de perfil (circular pequeña)
  isFavorite?: boolean;
  closingTime?: string;
  allCategories?: string[]; // Todas las categorías del establecimiento (category, primary_category, secondary_categories)
  address?: string; // Dirección del establecimiento
}

interface BusinessCardProps {
  business: Business;
  onToggleFavorite?: (id: string) => void;
}

export const BusinessCard = memo(function BusinessCard({ business, onToggleFavorite }: BusinessCardProps) {
  const { t } = useTranslation();
  
  // Usar coverImages si está disponible, luego coverImageUrl, luego fallback a images/imageUrl
  const coverImages = business.coverImages?.length 
    ? business.coverImages 
    : business.coverImageUrl 
    ? [business.coverImageUrl]
    : business.images?.length 
    ? business.images 
    : business.imageUrl 
    ? [business.imageUrl] 
    : [];
  
  // Format review count with commas
  const formatReviewCount = (count: number): string => {
    return count.toLocaleString();
  };
  
  return (
    <article className="bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in hover:shadow-md transition-shadow duration-300 group">
      {/* Cover Image Container - Landscape aspect ratio */}
      <div className="relative aspect-[16/10] bg-muted">
        <ImageCarousel images={coverImages} alt={business.name} clickable={true} />
        <button
          onClick={() => onToggleFavorite?.(business.id)}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 z-10 shadow-sm opacity-0 group-hover:opacity-100",
            business.isFavorite
              ? "bg-white text-red-500 opacity-100"
              : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-white"
          )}
        >
          <Heart
            className={cn("w-5 h-5", business.isFavorite && "fill-current")}
          />
        </button>
      </div>

      {/* Content Section - Directly attached to image */}
      <div className="px-4 py-3 space-y-1.5">
        {/* Header: Name and Rating (sin logo - solo portada en home) */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-lg text-gray-900 leading-tight flex-1">
            {business.name}
          </h3>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-semibold text-gray-900 text-sm">
                {business.rating.toFixed(1)}
              </span>
              {business.reviewCount > 0 && (
                <span className="text-gray-600 text-sm font-normal">
                  ({formatReviewCount(business.reviewCount)})
                </span>
              )}
            </div>
            {/* Address below rating */}
            {business.address && (
              <p className="text-[10px] text-gray-500 leading-tight text-right line-clamp-1 max-w-[120px]">
                {business.address}
              </p>
            )}
          </div>
        </div>

        {/* Location - Plain text, no icon */}
        {business.distance && business.distance !== "N/A" && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {business.distance}
          </p>
        )}

        {/* Category - Simple text, no styling */}
        {(() => {
          if (!business.category) return null;
          // Normalize underscores to hyphens for translation keys
          const normalizedCategory = business.category.replace(/_/g, "-");
          const categoryLabel = t(`categories.${normalizedCategory}`);
          // Only show if translation exists (not the key itself)
          if (categoryLabel && categoryLabel !== `categories.${normalizedCategory}`) {
            return (
              <p className="text-xs text-gray-600 leading-relaxed">
                {categoryLabel}
              </p>
            );
          }
          return null;
        })()}

        {/* View More Button */}
        <Link to={`/business/${business.id}`}>
          <Button 
            variant="outline" 
            className="w-full mt-3 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-foreground"
          >
            {t("common_ui.viewMore")}
          </Button>
        </Link>
      </div>
    </article>
  );
});
