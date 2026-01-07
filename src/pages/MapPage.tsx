import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Scissors, Sparkles, Droplets, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

// Category configuration with icons and colors
const CATEGORIES = [
  { id: "all", label: "Todos", icon: Sparkles, color: "#8B5CF6" },
  { id: "barber", label: "Barbería", icon: Scissors, color: "#F59E0B" },
  { id: "nails", label: "Uñas", icon: Sparkles, color: "#EC4899" },
  { id: "spa", label: "Spa", icon: Droplets, color: "#06B6D4" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, color: "#10B981" },
];

// Map category from database to filter category
const mapToFilterCategory = (category: string | null): string => {
  if (!category) return "other";
  const map: Record<string, string> = {
    "barberia": "barber",
    "barber": "barber",
    "hair-salon": "barber",
    "peluqueria": "barber",
    "nails": "nails",
    "uñas": "nails",
    "spa": "spa",
    "spa-sauna": "spa",
    "massage": "spa",
    "fitness": "fitness",
    "fitness-recovery": "fitness",
    "gym": "fitness",
  };
  return map[category.toLowerCase()] || "other";
};

interface BusinessMarker {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  marker: google.maps.Marker | null;
}

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

const MapPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [markers, setMarkers] = useState<BusinessMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [apiKey] = useState(() => {
    // Get API key from Supabase Edge Functions secrets (fetched at runtime)
    return "";
  });

  // Fetch businesses from Supabase ONCE
  const fetchBusinesses = useCallback(async () => {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, business_name, primary_category, latitude, longitude")
      .eq("is_public", true)
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      console.error("Error fetching businesses:", error);
      return [];
    }

    return (data || []).map((b) => ({
      id: b.id,
      name: b.business_name || "Sin nombre",
      category: mapToFilterCategory(b.primary_category),
      lat: Number(b.latitude),
      lng: Number(b.longitude),
      marker: null as google.maps.Marker | null,
    }));
  }, []);

  // Fetch API key from edge function
  const fetchApiKey = useCallback(async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("get-google-maps-key");
      if (error) {
        console.error("Error fetching API key:", error);
        return "";
      }
      return data?.apiKey || "";
    } catch (err) {
      console.error("Error:", err);
      return "";
    }
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      const googleMapsApiKey = await fetchApiKey();
      
      if (!googleMapsApiKey) {
        setMapError("API key de Google Maps no configurada.");
        setIsLoading(false);
        return;
      }

      // Check if Google Maps API is loaded
      if (!window.google || !window.google.maps) {
        // Load Google Maps script
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => initializeMap();
        script.onerror = () => {
          setMapError("Error cargando Google Maps. Verifica la API key.");
          setIsLoading(false);
        };
        
        document.head.appendChild(script);
      } else {
        initializeMap();
      }
    };

    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
        // Default center (Dominican Republic - Puerto Plata area)
        const defaultCenter = { lat: 19.7934, lng: -70.6884 };

        // Create single map instance
        const map = new window.google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 12,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Fetch businesses and create markers
        const businesses = await fetchBusinesses();
        
        if (businesses.length === 0) {
          setMapError("No hay establecimientos con ubicación configurada aún.");
        }

        // Create markers for each business and store in array
        const markersWithInstances = businesses.map((business) => {
          const categoryConfig = CATEGORIES.find(c => c.id === business.category) || CATEGORIES[0];
          
          const marker = new window.google.maps.Marker({
            position: { lat: business.lat, lng: business.lng },
            map: map,
            title: business.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: categoryConfig.color,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          // Add click listener to show info
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <strong>${business.name}</strong><br/>
                <span style="color: #666; font-size: 12px;">${categoryConfig.label}</span>
              </div>
            `,
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          return {
            ...business,
            marker,
          };
        });

        setMarkers(markersWithInstances);

        // Fit bounds to show all markers
        if (markersWithInstances.length > 0) {
          const bounds = new window.google.maps.LatLngBounds();
          markersWithInstances.forEach((m) => {
            bounds.extend({ lat: m.lat, lng: m.lng });
          });
          map.fitBounds(bounds);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Map initialization error:", err);
        setMapError("Error inicializando el mapa.");
        setIsLoading(false);
      }
    };

    initMap();

    // Cleanup
    return () => {
      markers.forEach((m) => m.marker?.setMap(null));
    };
  }, [fetchBusinesses, fetchApiKey]);

  // Filter markers by category WITHOUT reloading map or refetching data
  useEffect(() => {
    markers.forEach((m) => {
      if (m.marker) {
        if (selectedCategory === "all") {
          m.marker.setVisible(true);
        } else {
          m.marker.setVisible(m.category === selectedCategory);
        }
      }
    });
  }, [selectedCategory, markers]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground">{t("map.title")}</h1>
          </div>
        </div>
      </header>

      {/* Category Filter Buttons */}
      <div className="sticky top-14 z-40 bg-card border-b border-border">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar max-w-lg mx-auto">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Container */}
      <main className="relative h-[calc(100vh-56px-60px-80px)]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Cargando mapa...</span>
            </div>
          </div>
        )}
        
        {mapError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background p-4">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{mapError}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Los establecimientos necesitan tener coordenadas (latitud/longitud) configuradas.
              </p>
            </div>
          </div>
        )}

        <div 
          ref={mapRef} 
          className="w-full h-full"
          style={{ minHeight: "400px" }}
        />
      </main>

      <BottomNavigation />
    </div>
  );
};

export default MapPage;
