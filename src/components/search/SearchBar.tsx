import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onMapClick?: () => void;
  onFilterClick?: () => void;
  showFilter?: boolean;
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Buscar salones, servicios...", 
  onMapClick,
  onFilterClick,
  showFilter = true 
}: SearchBarProps) {
  const navigate = useNavigate();
  
  const handleMapClick = () => {
    if (onMapClick) {
      onMapClick();
    } else {
      navigate("/map");
    }
  };
  
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-12 pr-12 h-12 rounded-xl bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button 
          onClick={handleMapClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>
      {showFilter && onFilterClick && (
        <button 
          onClick={onFilterClick}
          className="flex-shrink-0 p-3 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
