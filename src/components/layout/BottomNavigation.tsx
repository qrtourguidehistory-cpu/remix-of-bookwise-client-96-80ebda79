import { Home, Search, Calendar, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export function BottomNavigation() {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  
  const navItems = [
    { icon: Home, path: "/" },
    { icon: Search, path: "/search" },
    { icon: Calendar, path: "/appointments" },
    { icon: User, path: "/profile" },
  ];

  // Update active index based on current path
  useEffect(() => {
    const index = navItems.findIndex(item => {
      if (item.path === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(item.path);
    });
    if (index !== -1) {
      setActiveIndex(index);
    }
  }, [location.pathname]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative flex items-center justify-center max-w-lg mx-auto px-6 pb-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        {/* Floating container with premium glassmorphism effect */}
        <div 
          className="absolute inset-x-6 bottom-6 rounded-3xl overflow-hidden"
          style={{
            height: 'clamp(4rem, 12vw, 4.5rem)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(255, 255, 255, 0.15)',
            willChange: 'transform',
          }}
        >
          <div className="relative flex items-center h-full px-3">
            {navItems.map((item, index) => {
              const isActive = index === activeIndex;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="relative z-10 flex flex-1 flex-col items-center justify-center h-full pointer-events-auto gap-1"
                  style={{
                    transition: 'color 0.3s ease-out',
                    minWidth: 0,
                  }}
                >
                  {({ isActive: navIsActive }: { isActive: boolean }) => {
                    const active = isActive || navIsActive;
                    return (
                      <>
                        <div className="relative flex items-center justify-center">
                          <item.icon
                            className={cn(
                              "w-6 h-6 relative transition-all duration-300",
                              active ? "text-primary" : "text-foreground",
                              active && "scale-110"
                            )}
                            style={{
                              strokeWidth: active ? 2.5 : 2,
                              filter: active ? 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))' : 'none',
                              transition: 'transform 0.3s ease-out, stroke-width 0.3s ease-out, filter 0.3s ease-out',
                            }}
                          />
                        </div>
                        {/* Subtle dot indicator */}
                        {active && (
                          <div 
                            className="absolute bottom-2 h-1 w-1 rounded-full bg-primary/60"
                            style={{
                              transition: 'opacity 0.3s ease-out',
                            }}
                          />
                        )}
                      </>
                    );
                  }}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
