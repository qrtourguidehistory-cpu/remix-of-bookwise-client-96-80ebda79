import { useState } from "react";
import { X, Heart, MapPin, Star, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

export interface FilterValues {
  sortBy: "best-match" | "nearest" | "top-rated";
  maxPrice: number;
  hasPromotions: boolean;
  acceptsGroups: boolean;
  establishmentType: "all" | "women-only" | "men-only";
}

const defaultFilters: FilterValues = {
  sortBy: "best-match",
  maxPrice: 20000,
  hasPromotions: false,
  acceptsGroups: false,
  establishmentType: "all",
};

export function FilterModal({ isOpen, onClose, onApply, initialFilters }: FilterModalProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterValues>(initialFilters || defaultFilters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters(defaultFilters);
  };

  const sortOptions = [
    { id: "best-match", icon: Heart, label: t("filters.bestMatch", "Mejor coincidencia") },
    { id: "nearest", icon: MapPin, label: t("filters.nearest", "Más cercanos") },
    { id: "top-rated", icon: Star, label: t("filters.topRated", "Mejor valorado") },
  ] as const;

  const bookingOptions = [
    { id: "hasPromotions", icon: Tag, label: t("filters.hasPromotions", "Ofrece promociones") },
    { id: "acceptsGroups", icon: Users, label: t("filters.acceptsGroups", "Acepta grupos") },
  ] as const;

  const establishmentTypes = [
    { id: "all", label: t("filters.allTypes", "Todos") },
    { id: "women-only", label: t("filters.womenOnly", "Solo mujeres") },
    { id: "men-only", label: t("filters.menOnly", "Solo hombres") },
  ] as const;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] mb-24 sm:mb-0 overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t("filters.title", "Filtros")}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Sort By */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {t("filters.filterBy", "Filtrar por")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = filters.sortBy === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setFilters({ ...filters, sortBy: option.id })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs text-center font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-border" />

          {/* Max Price */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("filters.maxPrice", "Precio máx.")}
              </h3>
              <span className="text-sm font-medium text-foreground">
                DOP {filters.maxPrice.toLocaleString()}+
              </span>
            </div>
            <Slider
              value={[filters.maxPrice]}
              onValueChange={([value]) => setFilters({ ...filters, maxPrice: value })}
              max={20000}
              min={500}
              step={500}
              className="w-full"
            />
          </section>

          <div className="h-px bg-border" />

          {/* Booking Options */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {t("filters.bookingOptions", "Opciones de reserva")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {bookingOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = filters[option.id as keyof FilterValues];
                return (
                  <button
                    key={option.id}
                    onClick={() => setFilters({ 
                      ...filters, 
                      [option.id]: !filters[option.id as keyof FilterValues] 
                    })}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border text-foreground hover:border-primary/30"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-border" />

          {/* Establishment Type */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {t("filters.establishmentType", "Tipo de establecimiento")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {establishmentTypes.map((type) => {
                const isSelected = filters.establishmentType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setFilters({ ...filters, establishmentType: type.id })}
                    className={`px-4 py-2.5 rounded-full border transition-all ${
                      isSelected 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border text-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex items-center gap-4">
          <button 
            onClick={handleClear}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("filters.clearAll", "Eliminar todos")}
          </button>
          <Button 
            onClick={handleApply}
            className="flex-1 h-12 rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {t("filters.apply", "Aplicar")}
          </Button>
        </div>
      </div>
    </div>
  );
}
