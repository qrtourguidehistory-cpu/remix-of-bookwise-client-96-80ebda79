import { useEffect } from "react";
import { useTheme } from "./use-theme";

/**
 * Hook to initialize the theme on app startup
 * This should be called once at the app root level
 * Forces light theme (light background, dark text) by default
 */
export function useThemeInitializer() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Force light theme on initial mount - ensure light is the default
    const root = document.documentElement;
    const body = document.body;
    
    // Get saved theme, but default to light for new users
    const savedTheme = localStorage.getItem("theme");
    
    // Only use saved theme if it exists, otherwise default to light
    if (!savedTheme) {
      setTheme("light");
      localStorage.setItem("theme", "light");
      // Force light classes immediately
      root.classList.remove("dark");
      root.classList.add("light");
      body.classList.remove("dark");
      body.classList.add("light");
    } else {
      setTheme(savedTheme as "light" | "dark");
      // Apply the saved theme classes
      if (savedTheme === "dark") {
        root.classList.remove("light");
        root.classList.add("dark");
        body.classList.remove("light");
        body.classList.add("dark");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
        body.classList.remove("dark");
        body.classList.add("light");
      }
    }
    
    // Set primary color to black (for buttons, icons, etc.)
    root.style.setProperty("--primary", "0 0% 0%");
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--accent", "0 0% 0%");
    root.style.setProperty("--ring", "0 0% 0%");
  }, [setTheme]);

  useEffect(() => {
    // Update DOM classes when theme changes
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      localStorage.setItem("theme", "light");
    }
    
    // Always keep primary color as black
    root.style.setProperty("--primary", "0 0% 0%");
    root.style.setProperty("--primary-foreground", "0 0% 100%");
  }, [theme]);
}
