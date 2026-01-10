import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { useTranslation } from "react-i18next";

const MapPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div 
      className="min-h-screen min-h-dvh bg-background flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-50 bg-card border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground">{t("map.title", "Mapa")}</h1>
          </div>
        </div>
      </header>

      {/* Map Container - Full height iframe */}
      <main className="flex-1 relative">
        <iframe 
          src="https://www.google.com/maps/d/u/0/embed?mid=1tpnnhbjHPI0eaIi-t58u7nTFJY9jhu0&ehbc=2E312F&noprof=1" 
          className="w-full h-full absolute inset-0"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Mapa de establecimientos"
        />
      </main>

      <BottomNavigation />
    </div>
  );
};

export default MapPage;
