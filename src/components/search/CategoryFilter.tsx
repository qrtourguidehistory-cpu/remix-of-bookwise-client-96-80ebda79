import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Category {
  id: string;
  label: string;
  count?: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
            selected === category.id
              ? "bg-primary text-primary-foreground shadow-card"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {t(`categories.${category.id}`)}
          {category.count !== undefined && (
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                selected === category.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {category.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
