import { User, Settings, Bell, HelpCircle, LogOut, Calendar, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useAppointments } from "@/hooks/useAppointments";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, signOut, isGuest, isLoading } = useAuth();
  const { appointments } = useAppointments();
  const { favoriteIds } = useFavorites();

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <BottomNavigation />
      </div>
    );
  }

  // Get name from profile or user metadata
  const displayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.user_metadata?.first_name 
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : user?.email?.split('@')[0] || t("profile.guest");
  
  const displayEmail = user?.email || t("profile.noEmail");
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || "";
  
  // Calculate stats from real data
  const totalAppointments = appointments.length;
  const totalFavorites = favoriteIds.size;
  const totalReviews = 0; // Would come from reviews query

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const menuItems = [
    { icon: User, label: t("profile.personalInfo"), href: "/profile/personal" },
    { icon: Bell, label: t("profile.notifications"), href: "/profile/notifications" },
    { icon: Settings, label: t("profile.settings"), href: "/profile/settings" },
    { icon: HelpCircle, label: t("profile.helpSupport"), href: "/profile/help" },
  ];

  // Show login prompt ONLY for guests (not for authenticated users without profile yet)
  if (isGuest && !user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card border-b border-border">
          <div className="px-4 py-6 max-w-lg mx-auto text-center">
            <h1 className="text-xl font-bold text-foreground">{t("profile.title")}</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t("profile.loginRequired")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("profile.loginRequiredDesc")}
          </p>
          <Button onClick={() => navigate("/auth")}>
            {t("auth.login.title")}
          </Button>
        </main>
        <BottomNavigation />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border">
        <div className="px-5 py-6 max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16 border-2 border-border">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg font-medium">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground leading-tight">{displayName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{displayEmail}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full h-11 font-normal"
            onClick={() => navigate("/profile/personal")}
          >
            {t("profile.editProfile")}
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Stats - Compact Horizontal Row */}
        <section className="mb-5 animate-fade-in">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex divide-x divide-border">
              <button 
                onClick={() => navigate("/appointments")}
                className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors flex-shrink-0">
                  <Calendar className="w-4 h-4 text-foreground" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-lg font-bold text-foreground leading-none">{totalAppointments}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{t("nav.appointments")}</p>
                </div>
              </button>
              <button 
                onClick={() => navigate("/favorites")}
                className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors flex-shrink-0">
                  <Heart className="w-4 h-4 text-foreground" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-lg font-bold text-foreground leading-none">{totalFavorites}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{t("nav.favorites")}</p>
                </div>
              </button>
              <button 
                onClick={() => navigate("/reviews")}
                className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors flex-shrink-0">
                  <Star className="w-4 h-4 text-foreground" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-lg font-bold text-foreground leading-none">{totalReviews}</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{t("profile.reviews")}</p>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Menu - First Card */}
        <section className="mb-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-0"
              >
                <item.icon className="w-5 h-5 text-foreground flex-shrink-0" strokeWidth={2} />
                <span className="text-[15px] font-normal text-foreground text-left flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Logout - Separate Card */}
        <section className="mb-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/50 active:bg-muted transition-colors"
            >
              <LogOut className="w-5 h-5 text-foreground flex-shrink-0" strokeWidth={2} />
              <span className="text-[15px] font-normal text-foreground text-left flex-1">{t("profile.logout")}</span>
            </button>
          </div>
        </section>

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Bookwise v1.0.0
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ProfilePage;