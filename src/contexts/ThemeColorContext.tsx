import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { themeColors, ThemeColor } from "@/hooks/useThemeColor";

// Re-export themeColors for convenience
export { themeColors };

interface ThemeColorContextType {
  themeColorId: string;
  currentTheme: ThemeColor;
  themeColors: ThemeColor[];
  setThemeColor: (id: string) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: ReactNode }) {
  const [themeColorId, setThemeColorIdState] = useState<string>(() => {
    return localStorage.getItem("themeColorId") || "black";
  });

  const currentTheme = themeColors.find((t) => t.id === themeColorId) || themeColors.find((t) => t.id === "black") || themeColors[0];

  const applyTheme = useCallback((theme: ThemeColor) => {
    const root = document.documentElement;
    // Apply color immediately - these override the CSS defaults
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--accent", theme.primary);
    root.style.setProperty("--ring", theme.primary);
    root.style.setProperty("--coral", theme.primary);
    root.style.setProperty("--coral-light", theme.primaryLight);
    root.style.setProperty("--coral-dark", theme.primaryDark);
    
    // Set primary-foreground based on color brightness
    const hslParts = theme.primary.trim().split(/\s+/);
    const lightness = parseFloat(hslParts[2] || "0");
    const isDarkColor = theme.id === "black" || lightness < 50;
    root.style.setProperty("--primary-foreground", isDarkColor ? "0 0% 100%" : "0 0% 0%");
    
    // Also update sidebar colors
    root.style.setProperty("--sidebar-primary", theme.primary);
    root.style.setProperty("--sidebar-ring", theme.primary);
    
    // Force a reflow to ensure styles are applied
    void root.offsetHeight;
    
    // Log for debugging (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("🎨 Theme color applied:", theme.id, "→", theme.primary);
    }
  }, []);

  // Apply theme on mount and when themeColorId changes
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  const setThemeColor = useCallback((id: string) => {
    const theme = themeColors.find((t) => t.id === id);
    if (theme) {
      setThemeColorIdState(id);
      localStorage.setItem("themeColorId", id);
      applyTheme(theme);
    }
  }, [applyTheme]);

  return (
    <ThemeColorContext.Provider value={{ themeColorId, currentTheme, themeColors, setThemeColor }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error("useThemeColor must be used within a ThemeColorProvider");
  }
  return context;
}

