import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay } from "date-fns";
import { es, enUS, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface DatePickerProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
}

export function DatePicker({ selected, onSelect }: DatePickerProps) {
  const [startDate, setStartDate] = useState(new Date());
  const { i18n } = useTranslation();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const getLocale = () => {
    switch (i18n.language) {
      case "en": return enUS;
      case "fr": return fr;
      default: return es;
    }
  };

  const locale = getLocale();

  const handlePrev = () => setStartDate(addDays(startDate, -7));
  const handleNext = () => setStartDate(addDays(startDate, 7));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-medium text-foreground capitalize">
          {format(startDate, "MMMM yyyy", { locale })}
        </span>
        <button
          onClick={handleNext}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const isSelected = selected && isSameDay(date, selected);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelect(date)}
              className={cn(
                "flex flex-col items-center py-3 rounded-xl transition-all duration-200",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-card"
                  : isToday
                  ? "bg-coral-light text-coral"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <span className="text-xs font-medium uppercase">
                {format(date, "EEE", { locale })}
              </span>
              <span className="text-lg font-bold mt-1">
                {format(date, "d")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
