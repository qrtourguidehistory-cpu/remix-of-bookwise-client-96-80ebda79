import { memo } from "react";
import { BusinessCardCompact, BusinessCompact } from "@/components/business/BusinessCardCompact";
import { ChevronRight } from "lucide-react";

interface CategorySectionProps {
  title: string;
  businesses: BusinessCompact[];
  onToggleFavorite?: (id: string) => void;
  showViewAll?: boolean;
  onViewAll?: () => void;
  isFirstSection?: boolean; // Para identificar la primera sección "Todos los Establecimientos"
}

export const CategorySection = memo(function CategorySection({
  title,
  businesses,
  onToggleFavorite,
  showViewAll = false,
  onViewAll,
  isFirstSection = false,
}: CategorySectionProps) {
  if (businesses.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm text-primary font-medium hover:underline"
          >
            Ver todo
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal Scroll Container - NO padding here, only overflow */}
      <div
        className="overflow-x-auto pb-3 scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Inner flex container - padding goes HERE, not in scroll container */}
        <div
          className="flex gap-4 snap-x snap-mandatory"
          style={{
            paddingLeft: `max(env(safe-area-inset-left, 0px), 1rem)`, // 16px minimum, respect safe areas
            paddingRight: `max(env(safe-area-inset-right, 0px), 1rem)`, // 16px minimum, respect safe areas
          }}
        >
          {businesses.map((business) => (
            <div key={business.id} className="snap-start">
              <BusinessCardCompact
                business={business}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
