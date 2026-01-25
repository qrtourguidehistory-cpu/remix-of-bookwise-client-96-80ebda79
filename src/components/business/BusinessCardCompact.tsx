import { memo } from "react";
import { Heart, Star, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface BusinessCompact {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  address?: string;
  category?: string;
  imageUrl: string; // Deprecated: usar coverImageUrl
  coverImageUrl?: string; // Imagen de portada (principal)
  logoUrl?: string; // Imagen de perfil (circular pequeña)
  isFavorite?: boolean;
}

interface BusinessCardCompactProps {
  business: BusinessCompact;
  onToggleFavorite?: (id: string) => void;
}

export const BusinessCardCompact = memo(function BusinessCardCompact({ business, onToggleFavorite }: BusinessCardCompactProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleClick = () => {
    navigate(`/business/${business.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(business.id);
  };

  // Format review count with commas
  const formatReviewCount = (count: number): string => {
    return count.toLocaleString();
  };

  // Get category label - normalize category key (handle both spa-sauna and spa_sauna)
  const getCategoryLabel = (category: string | undefined): string => {
    if (!category) return "";
    // Normalize underscores to hyphens for translation keys
    const normalizedCategory = category.replace(/_/g, "-");
    const translated = t(`categories.${normalizedCategory}`);
    // If translation returns the key itself, return empty string to avoid showing raw key
    return translated && translated !== `categories.${normalizedCategory}` ? translated : "";
  };
  
  const categoryLabel = getCategoryLabel(business.category);

  return (
    <div
      onClick={handleClick}
      className="flex-shrink-0 w-[180px] cursor-pointer group"
    >
      {/* Cover Image - Main element with rounded corners on all 4 sides */}
      <div className="relative">
        {business.coverImageUrl || business.imageUrl ? (
          <img
            src={business.coverImageUrl || business.imageUrl}
            alt={business.name}
            loading="lazy"
            className="w-full aspect-[16/11] rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full aspect-[16/11] rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-bold text-primary/30">
              {business.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Favorite Button - Overlay on image */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:bg-white hover:scale-110 shadow-sm z-10 opacity-0 group-hover:opacity-100"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              business.isFavorite
                ? "fill-red-500 text-red-500"
                : "text-gray-400"
            )}
          />
        </button>
      </div>

      {/* Content - Below image, outside image area */}
      <div className="mt-2 space-y-1">
        {/* Business Name */}
        <h3 className="font-semibold text-[15px] text-gray-900 leading-tight line-clamp-2">
          {business.name}
        </h3>
        
        {/* Rating and Review Count - Single line (sin logo en home) */}
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900">
            {business.rating.toFixed(1)}
          </span>
          {business.reviewCount > 0 && (
            <span className="text-sm text-gray-600 font-normal">
              ({formatReviewCount(business.reviewCount)})
            </span>
          )}
        </div>

        {/* Location/Address - Plain text, no icon */}
        {business.address && (
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-1">
            {business.address}
          </p>
        )}

        {/* Service Type/Category - Simple text, no styling */}
        {categoryLabel && (
          <p className="text-xs text-gray-600 leading-relaxed">
            {categoryLabel}
          </p>
        )}
      </div>
    </div>
  );
});
