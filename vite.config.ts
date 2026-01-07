import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./", // Use relative paths for Capacitor compatibility
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "favicon.ico", "robots.txt"],
      // Deshabilitar Service Worker en Capacitor/Android
      injectRegister: null, // No inyectar automáticamente, lo haremos manualmente
      manifest: {
        name: "Bookwise - Reserva tu cita de belleza",
        short_name: "Bookwise",
        description: "Encuentra y reserva citas en los mejores salones de belleza, spas y barberías cerca de ti.",
        theme_color: "#1e3a5f",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/favicon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/favicon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/favicon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          }
        ],
        shortcuts: [
          {
            name: "Buscar Establecimientos",
            short_name: "Buscar",
            description: "Busca salones, spas y barberías",
            url: "/search",
            icons: [{ src: "/favicon.png", sizes: "96x96" }]
          },
          {
            name: "Mis Citas",
            short_name: "Citas",
            description: "Ver mis citas programadas",
            url: "/appointments",
            icons: [{ src: "/favicon.png", sizes: "96x96" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Deshabilitado en desarrollo para evitar conflictos
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
