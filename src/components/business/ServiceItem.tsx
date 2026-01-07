import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency?: string;
  price_currency?: string;
  price_rd?: number;
  price_usd?: number;
}

interface ServiceItemProps {
  service: Service;
  onSelect: (service: Service) => void;
  selected?: boolean;
}

export function ServiceItem({ service, onSelect, selected }: ServiceItemProps) {
  const currency = service.currency || "RD$";
  
  // Ensure price_rd and price_usd are numbers
  const priceRD = service.price_rd !== undefined && service.price_rd !== null 
    ? Number(service.price_rd) 
    : (service.price ? Number(service.price) : 0);
  
  const priceUSD = service.price_usd !== undefined && service.price_usd !== null 
    ? Number(service.price_usd) 
    : 0;
  

  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <h4 className="font-medium text-foreground">{service.name}</h4>
        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
            {service.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-gray-600" strokeWidth={2} />
          <span>{service.duration} min</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="text-right">
          <p className="font-semibold text-foreground">
            RD$ {priceRD.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            USD ${priceUSD.toFixed(2)}
          </p>
        </div>
        <Button
          variant={selected ? "coral" : "coral-outline"}
          size="sm"
          onClick={() => onSelect(service)}
        >
          {selected ? "Seleccionado" : "Seleccionar"}
        </Button>
      </div>
    </div>
  );
}
