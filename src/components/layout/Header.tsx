import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function Header() {
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(false);

  // Alerta cada 10 segundos
  useEffect(() => {
    // Primera alerta después de 2 segundos
    const initialTimeout = setTimeout(() => {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 1500);
    }, 2000);

    // Repetir cada 10 segundos
    const interval = setInterval(() => {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 1500);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  return (
    <header 
      className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto relative">
        {/* Left: App Name with Alert Animation */}
        <motion.div 
          className="relative"
          animate={showAlert ? {
            x: [-2, 2, -2, 2, -2, 2, 0],
            scale: [1, 1.05, 1, 1.05, 1],
          } : {}}
          transition={{ 
            duration: 0.5,
            ease: "easeInOut"
          }}
        >
          <h1 className="text-xl font-bold text-foreground">Mí Turnow</h1>
          
          {/* Campana de alerta */}
          <motion.div
            className="absolute -top-1 -right-6"
            animate={showAlert ? {
              rotate: [-15, 15, -15, 15, -15, 15, 0],
              scale: [1, 1.2, 1, 1.2, 1],
            } : { scale: 1 }}
            transition={{ 
              duration: 0.6,
              ease: "easeInOut"
            }}
          >
            <motion.div
              className="relative"
              animate={showAlert ? { opacity: 1 } : { opacity: 0.3 }}
            >
              <Bell 
                className={`w-5 h-5 ${showAlert ? 'text-orange-500' : 'text-gray-400'}`}
                strokeWidth={2.5}
                fill={showAlert ? 'currentColor' : 'none'}
              />
              
              {/* Punto de notificación */}
              {showAlert && (
                <motion.div
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full"
                  animate={{
                    scale: [0, 1.3, 1],
                    opacity: [0, 1, 1]
                  }}
                  transition={{ duration: 0.3 }}
                />
              )}
              
              {/* Ondas de alerta */}
              {showAlert && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-orange-500"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ 
                      scale: [1, 2],
                      opacity: [0.8, 0]
                    }}
                    transition={{ 
                      duration: 1,
                      ease: "easeOut"
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-orange-400"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ 
                      scale: [1, 2.5],
                      opacity: [0.6, 0]
                    }}
                    transition={{ 
                      duration: 1.2,
                      delay: 0.2,
                      ease: "easeOut"
                    }}
                  />
                </>
              )}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right: Search + Notifications */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/search")}
            className="text-muted-foreground"
          >
            <Search className="w-5 h-5" />
          </Button>
          <NotificationsDropdown />
        </div>
      </div>
    </header>
  );
}
