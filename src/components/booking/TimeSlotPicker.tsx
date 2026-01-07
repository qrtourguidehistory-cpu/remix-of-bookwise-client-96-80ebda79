import { cn } from "@/lib/utils";
import { useTimeFormat } from "@/hooks/useTimeFormat";

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function TimeSlotPicker({ slots, selected, onSelect }: TimeSlotPickerProps) {
  const { formatTime } = useTimeFormat();

  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot) => (
        <button
          key={slot.id}
          onClick={() => slot.available && onSelect(slot.id)}
          disabled={!slot.available}
          className={cn(
            "py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200",
            slot.available
              ? selected === slot.id
                ? "bg-primary text-primary-foreground shadow-card"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "bg-muted text-muted-foreground/50 cursor-not-allowed line-through"
          )}
        >
          {formatTime(slot.time)}
        </button>
      ))}
    </div>
  );
}
