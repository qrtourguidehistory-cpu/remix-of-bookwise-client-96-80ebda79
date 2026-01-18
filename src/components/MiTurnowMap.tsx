import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { MapPin, Loader2 } from "lucide-react";

type Business = Tables<"businesses">;

// Token de Mapbox - SOLO desde variable de entorno (sin fallback hardcodeado)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface MiTurnowMapProps {
  className?: string;
}

const MiTurnowMap = ({ className = "" }: MiTurnowMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar negocios aprobados desde Supabase
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, business_name, latitude, longitude, slug, category, address")
          .eq("is_public", true)
          .eq("is_active", true)
          .not("latitude", "is", null)
          .not("longitude", "is", null);

        if (error) throw error;

        setBusinesses(data || []);
      } catch (err) {
        console.error("Error al cargar negocios:", err);
        setError("No se pudieron cargar los negocios");
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Validar que el token esté disponible
    if (!MAPBOX_TOKEN) {
      console.error('[Mapbox] ❌ VITE_MAPBOX_ACCESS_TOKEN no está configurada. El mapa no se puede inicializar.');
      setError('Token de Mapbox no configurado. Por favor, contacta al administrador.');
      setLoading(false);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Estilo del mapa según tema
    const mapStyle = theme === "dark" 
      ? "mapbox://styles/mapbox/dark-v11" 
      : "mapbox://styles/mapbox/streets-v12";

    // Coordenadas por defecto (Santo Domingo, República Dominicana)
    const defaultCenter: [number, number] = [-69.931212, 18.486058];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: defaultCenter,
      zoom: 12,
      attributionControl: false, // Sin atribución de Mapbox para marca blanca
    });

    // Control de geolocalización
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    });

    map.current.addControl(geolocateControl, "top-right");

    // Controles de zoom
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // NO activar geolocalización automáticamente - el usuario debe hacer clic explícitamente
    // Esto cumple con las políticas de privacidad de Google Play
    // El botón de geolocalización está disponible pero no se activa automáticamente

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [theme]);

  // Agregar marcadores cuando se carguen los negocios
  useEffect(() => {
    if (!map.current || businesses.length === 0) return;

    // Limpiar marcadores existentes
    const markers: mapboxgl.Marker[] = [];

    businesses.forEach((business) => {
      if (!business.latitude || !business.longitude) return;

      // Crear elemento personalizado para el marcador
      const markerEl = document.createElement("div");
      markerEl.className = "custom-marker";
      markerEl.style.cssText = `
        width: 32px;
        height: 32px;
        background-color: hsl(var(--primary));
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      `;

      // Icono dentro del marcador
      const icon = document.createElement("div");
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
      markerEl.appendChild(icon);

      // Hover effect
      markerEl.addEventListener("mouseenter", () => {
        markerEl.style.transform = "scale(1.2)";
      });
      markerEl.addEventListener("mouseleave", () => {
        markerEl.style.transform = "scale(1)";
      });

      // Contenido del popup
      const popupContent = document.createElement("div");
      popupContent.className = "mapbox-popup-content";
      popupContent.style.cssText = `
        padding: 12px;
        min-width: 200px;
      `;

      const title = document.createElement("h3");
      title.textContent = business.business_name || "Negocio";
      title.style.cssText = `
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        color: hsl(var(--foreground));
      `;
      popupContent.appendChild(title);

      if (business.category) {
        const category = document.createElement("p");
        category.textContent = business.category;
        category.style.cssText = `
          font-size: 14px;
          color: hsl(var(--muted-foreground));
          margin-bottom: 8px;
        `;
        popupContent.appendChild(category);
      }

      if (business.address) {
        const address = document.createElement("p");
        address.textContent = business.address;
        address.style.cssText = `
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          margin-bottom: 12px;
        `;
        popupContent.appendChild(address);
      }

      const button = document.createElement("button");
      button.textContent = "Reservar cita";
      button.className = "mapbox-button";
      button.style.cssText = `
        width: 100%;
        padding: 8px 16px;
        background-color: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s;
      `;
      button.onmouseenter = () => {
        button.style.opacity = "0.9";
      };
      button.onmouseleave = () => {
        button.style.opacity = "1";
      };
      button.onclick = () => {
        const path = business.slug 
          ? `/business/${business.slug}` 
          : `/business/${business.id}`;
        navigate(path);
      };
      popupContent.appendChild(button);

      // Crear popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
        className: "custom-popup",
      }).setDOMContent(popupContent);

      // Crear marcador
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([business.longitude, business.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markers.push(marker);
    });

    // Ajustar vista para mostrar todos los marcadores
    if (businesses.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      businesses.forEach((business) => {
        if (business.latitude && business.longitude) {
          bounds.extend([business.longitude, business.latitude]);
        }
      });
      map.current?.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [businesses, navigate]);

  // Actualizar estilo del mapa cuando cambie el tema
  useEffect(() => {
    if (!map.current) return;

    const mapStyle = theme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/streets-v12";

    map.current.setStyle(mapStyle);
  }, [theme]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">Error al cargar el mapa</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando mapa...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
};

export default MiTurnowMap;

