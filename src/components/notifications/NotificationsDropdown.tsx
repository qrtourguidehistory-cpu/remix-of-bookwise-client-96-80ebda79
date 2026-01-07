import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNotifications, type Notification } from "@/hooks/useNotifications";

export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading, error, refetch } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Debug: Log notification state
  useEffect(() => {
    if (open) {
      console.log("🔔 [NotificationsDropdown] Opened - State:", {
        notificationsCount: notifications.length,
        unreadCount,
        loading,
        error,
        notifications: notifications.map(n => ({
          id: n.id,
          title: n.title,
          read: n.read,
          type: n.type
        }))
      });
    }
  }, [open, notifications, unreadCount, loading, error]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setOpen(false);
    navigate(`/notifications/${notification.id}`);
  };

  // Refetch notifications when dropdown opens to ensure fresh data
  useEffect(() => {
    if (open) {
      // Refetch when dropdown opens to ensure we have the latest notifications
      // This helps when user navigates back from another page
      refetch();
    }
  }, [open, refetch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("notifications.title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-primary hover:text-primary/80"
            >
              <Check className="w-3 h-3 mr-1" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-50 animate-pulse" />
              <p>{t("common.loading") || "Cargando..."}</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-red-500 text-sm">Error: {error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>{t("notifications.noNotifications") || "No tienes notificaciones"}</p>
            </div>
          ) : (
            notifications
              .slice(0, 10) // Mostrar las últimas 10 notificaciones
              .map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50/50 border-b border-gray-100 last:border-0",
                    notification.read && "opacity-70" // Hacer las leídas más transparentes
                  )}
                >
                  {/* Simple dot indicator - solo para no leídas */}
                  <div className="flex-shrink-0 pt-1">
                    {!notification.read ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn(
                        "font-semibold text-[15px]",
                        notification.read ? "text-gray-600" : "text-gray-900"
                      )}>
                        {notification.title}
                      </p>
                    </div>
                    <p className={cn(
                      "text-sm line-clamp-2 mb-1 leading-relaxed",
                      notification.read ? "text-gray-500" : "text-gray-600"
                    )}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </button>
              ))
          )}
        </div>
        <div className="p-3 border-t border-border">
          <Link to="/notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full text-primary">
              {t("notifications.viewAll")}
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
