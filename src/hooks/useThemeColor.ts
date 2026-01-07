// This hook is deprecated - the app now uses a simple light/dark theme system
// Kept for backwards compatibility with any components that might still import it

export interface ThemeColor {
  id: string;
  name: string;
  nameEs: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  foreground: string;
}

export const themeColors: ThemeColor[] = [
  {
    id: "black",
    name: "Black",
    nameEs: "Negro",
    primary: "0 0% 0%",
    primaryLight: "0 0% 20%",
    primaryDark: "0 0% 5%",
    foreground: "0 0% 100%",
  },
];

export function useThemeColor() {
  return {
    themeColorId: "black",
    setThemeColor: () => {},
    currentTheme: themeColors[0],
  };
}
