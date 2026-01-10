import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate();

  return (
    <header 
      className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        {/* Left: App Name */}
        <h1 className="text-xl font-bold text-foreground">Mí Turnow</h1>

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
