import { useState, useEffect, useCallback } from "react";

export type TimeFormat = "12h" | "24h";

export function useTimeFormat() {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(() => {
    const saved = localStorage.getItem("timeFormat");
    return (saved as TimeFormat) || "12h";
  });

  useEffect(() => {
    localStorage.setItem("timeFormat", timeFormat);
  }, [timeFormat]);

  const setTimeFormat = useCallback((format: TimeFormat) => {
    setTimeFormatState(format);
    localStorage.setItem("timeFormat", format);
  }, []);

  const formatTime = useCallback((time24: string): string => {
    if (timeFormat === "24h") return time24;

    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  }, [timeFormat]);

  return {
    timeFormat,
    setTimeFormat,
    formatTime,
  };
}
