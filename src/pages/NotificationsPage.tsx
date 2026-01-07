import { ArrowLeft, Bell, Calendar, Tag, Star, MessageSquare, Loader2, Settings, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNotifications, type Notification, type NotificationType } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface NotificationSetting {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  enabled: boolean;
}

const iconMap: Record<NotificationType, typeof Calendar> = {
  appointment: Calendar,
  promotion: Tag,
  review: Star,
  system: Settings,
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, updateProfile } = useAuth();
  const { notifications, loading: notificationsLoading, markAsRead, deleteNotification } = useNotifications();
  const [isSaving, setIsSaving] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    navigate(`/notifications/${notification.id}`);
  };

  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setSwipingId(notificationId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = Math.abs(currentY - touchStartY.current);
    
    // Only allow horizontal swipe (swipe right to delete)
    if (deltaY < 50 && deltaX > 0) {
      setSwipeOffset(Math.min(deltaX, 80)); // Max 80px swipe
    }
  };

  const handleTouchEnd = (notificationId: string) => {
    if (swipeOffset > 50) {
      // Swipe threshold reached, delete notification
      deleteNotification(notificationId);
      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada",
      });
    }
    setSwipingId(null);
    setSwipeOffset(0);
  };

  const handleDeleteClick = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
    toast({
      title: "Notificación eliminada",
      description: "La notificación ha sido eliminada",
    });
  };
  
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "appointments",
      icon: <Calendar className="w-5 h-5 text-gray-700" strokeWidth={2} />,
      titleKey: "appointmentReminders",
      descriptionKey: "appointmentRemindersDesc",
      enabled: true,
    },
    {
      id: "promotions",
      icon: <Tag className="w-5 h-5 text-gray-700" strokeWidth={2} />,
      titleKey: "promotions",
      descriptionKey: "promotionsDesc",
      enabled: true,
    },
    {
      id: "reviews",
      icon: <Star className="w-5 h-5 text-gray-700" strokeWidth={2} />,
      titleKey: "reviewRequests",
      descriptionKey: "reviewRequestsDesc",
      enabled: false,
    },
    {
      id: "messages",
      icon: <MessageSquare className="w-5 h-5 text-gray-700" strokeWidth={2} />,
      titleKey: "businessMessages",
      descriptionKey: "businessMessagesDesc",
      enabled: true,
    },
    {
      id: "updates",
      icon: <Bell className="w-5 h-5 text-gray-700" strokeWidth={2} />,
      titleKey: "appUpdates",
      descriptionKey: "appUpdatesDesc",
      enabled: false,
    },
  ]);

  const [emailNotifications, setEmailNotifications] = useState(true);

  // Load saved preferences from profile or localStorage as fallback
  useEffect(() => {
    if (profile?.accepts_marketing !== null && profile?.accepts_marketing !== undefined) {
      setEmailNotifications(profile.accepts_marketing);
    }
    
    // Load push notification settings from localStorage (could be moved to DB later)
    const saved = localStorage.getItem("notificationSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(prev => prev.map(s => ({
        ...s,
        enabled: parsed[s.id] ?? s.enabled
      })));
    }
  }, [profile]);

  // Save push notification preferences to localStorage
  const saveLocalSettings = (newSettings: NotificationSetting[]) => {
    const toSave: Record<string, boolean> = {};
    newSettings.forEach(s => {
      toSave[s.id] = s.enabled;
    });
    localStorage.setItem("notificationSettings", JSON.stringify(toSave));
  };

  const handleToggle = (id: string) => {
    const newSettings = settings.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setSettings(newSettings);
    saveLocalSettings(newSettings);
    
    const setting = settings.find(s => s.id === id);
    toast({
      title: setting?.enabled ? t("notifications.deactivated") : t("notifications.activated"),
      description: `${t(`notifications.${setting?.titleKey}`)}`,
    });
  };

  const handleEmailToggle = async (enabled: boolean) => {
    if (!user) {
      // Fallback to localStorage for guests
      setEmailNotifications(enabled);
      localStorage.setItem("emailNotifications", JSON.stringify(enabled));
      toast({
        title: enabled ? t("notifications.weeklySummaryActivated") : t("notifications.weeklySummaryDeactivated"),
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await updateProfile({ accepts_marketing: enabled });
      
      if (error) throw error;
      
      setEmailNotifications(enabled);
      toast({
        title: enabled ? t("notifications.weeklySummaryActivated") : t("notifications.weeklySummaryDeactivated"),
      });
    } catch (error: any) {
      console.error("Error saving email preference:", error);
      toast({
        title: t("common.error"),
        description: "No se pudo guardar la preferencia",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{t("notifications.title")}</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Inicia sesión para gestionar tus notificaciones</p>
            <Button variant="coral" onClick={() => navigate("/auth")}>
              {t("common.login")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t("notifications.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Notifications History - Collapsible */}
        <section className="animate-fade-in">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("notifications.history") || "Historial"}
            </h2>
            {historyExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>
          {historyExpanded && (
            <>
              {notificationsLoading ? (
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t("common.loading") || "Cargando..."}</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-500">{t("notifications.noNotifications") || "No hay notificaciones"}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className="relative border-b border-gray-100 last:border-0 overflow-hidden"
                      onTouchStart={(e) => handleTouchStart(e, notification.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => handleTouchEnd(notification.id)}
                      style={{
                        transform: swipingId === notification.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                        transition: swipingId === notification.id ? 'none' : 'transform 0.3s ease-out',
                      }}
                    >
                      {/* Delete button (revealed on swipe) */}
                      <div
                        className={cn(
                          "absolute left-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center z-10",
                          swipingId === notification.id && swipeOffset > 0 ? "opacity-100" : "opacity-0"
                        )}
                        style={{
                          transition: 'opacity 0.2s ease-out',
                        }}
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </div>
                      
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50/50 relative z-20 bg-white",
                          !notification.read && "bg-primary/5"
                        )}
                      >
                        {/* Simple dot indicator */}
                        <div className="flex-shrink-0 pt-1">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            !notification.read ? "bg-primary" : "bg-gray-300"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-[15px]">
                              {notification.title}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-1 leading-relaxed">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Push Notifications Settings */}
        <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("notifications.push")}
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {settings.map((setting, index) => (
              <div
                key={setting.id}
                className="flex items-center justify-between px-4 py-4 border-b border-border last:border-0 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-3 flex-1 pr-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {setting.icon}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t(`notifications.${setting.titleKey}`)}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{t(`notifications.${setting.descriptionKey}`)}</p>
                  </div>
                </div>
                <Switch
                  checked={setting.enabled}
                  onCheckedChange={() => handleToggle(setting.id)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Email Preferences */}
        <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("notifications.emailSection")}
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex-1 pr-4">
                <p className="font-medium text-foreground">{t("notifications.weeklySummary")}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("notifications.weeklySummaryDesc")}
                </p>
              </div>
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch 
                  checked={emailNotifications} 
                  onCheckedChange={handleEmailToggle}
                />
              )}
            </div>
          </div>
        </section>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {t("notifications.preferencesNote")}
        </p>
      </main>
    </div>
  );
};

export default NotificationsPage;
