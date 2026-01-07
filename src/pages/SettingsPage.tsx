import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Globe, Fingerprint, Lock, Shield, Trash2, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { useTimeFormat, TimeFormat } from "@/hooks/useTimeFormat";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { isAvailable, authenticate, setCredentials, deleteCredentials } = useBiometricAuth();
  
  const [biometric, setBiometric] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    // Load biometric status from profile or localStorage
    const savedBiometric = profile?.biometric_enabled || localStorage.getItem("biometricEnabled") === "true";
    setBiometric(savedBiometric);
  }, [profile]);

  const handleDarkModeToggle = (enabled: boolean) => {
    const newTheme = enabled ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Update DOM classes immediately
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    
    toast({
      title: t("settings.themeChanged"),
      description: enabled ? t("settings.darkModeEnabled") : t("settings.lightModeEnabled"),
    });
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    toast({
      title: t("settings.languageChanged"),
      description: `${t("settings.languageChangedTo")} ${t(`languages.${lang}`)}`,
    });
  };

  const handleTimeFormatChange = (format: string) => {
    setTimeFormat(format as TimeFormat);
    toast({
      title: t("settings.timeFormatChanged"),
      description: format === "12h" ? t("settings.timeFormat12h") : t("settings.timeFormat24h"),
    });
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!isAvailable) {
        toast({
          title: t("common.error"),
          description: t("settings.biometricNotSupported"),
          variant: "destructive",
        });
        return;
      }
      
      // Authenticate user first, then save credentials
      const authSuccess = await authenticate(t("settings.biometric"));
      if (authSuccess) {
        // Store a flag that biometric is enabled
        await setCredentials(user?.email || "user", "biometric_enabled");
        localStorage.setItem("biometricEnabled", "true");
        setBiometric(true);
        
        // Update profile in Supabase
        if (user) {
          await updateProfile({ biometric_enabled: true });
        }
        toast({
          title: t("settings.biometric"),
          description: t("settings.biometricEnabled"),
        });
      } else {
        toast({
          title: t("common.error"),
          description: t("settings.biometricFailed"),
          variant: "destructive",
        });
      }
    } else {
      await deleteCredentials();
      localStorage.setItem("biometricEnabled", "false");
      setBiometric(false);
      if (user) {
        await updateProfile({ biometric_enabled: false });
      }
      toast({
        title: t("settings.biometric"),
        description: t("settings.biometricDisabled"),
      });
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: t("common.error"),
        description: t("settings.passwordMismatch"),
        variant: "destructive",
      });
      return;
    }
    if (passwords.new.length < 8) {
      toast({
        title: t("common.error"),
        description: t("settings.passwordMinLength"),
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });
      
      if (error) throw error;
      
      setPasswordDialogOpen(false);
      setPasswords({ current: "", new: "", confirm: "" });
      toast({
        title: t("settings.passwordChanged"),
        description: t("settings.passwordChangedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Sign out and clear local data
      await signOut();
      localStorage.clear();
      toast({
        title: t("settings.accountDeleted"),
        description: t("settings.accountDeletedDesc"),
      });
      setDeleteDialogOpen(false);
      navigate("/splash");
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: t("profile.logout"),
        description: t("settings.logoutSuccess"),
      });
      navigate("/splash");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-4 h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-foreground">{t("settings.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Appearance */}
        <section className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
          <h2 className="px-4 py-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
            {t("settings.appearance")}
          </h2>
          
          {/* Dark Mode */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {(resolvedTheme || theme) === "dark" ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="font-medium text-foreground">{t("settings.darkMode")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.darkModeDesc")}</p>
              </div>
            </div>
            <Switch
              checked={(resolvedTheme || theme) === "dark"}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{t("settings.language")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
              </div>
            </div>
            <Select value={i18n.language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Format */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{t("settings.timeFormat")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.timeFormatDesc")}</p>
              </div>
            </div>
            <Select value={timeFormat} onValueChange={handleTimeFormatChange}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12h (AM/PM)</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Security */}
        <section className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="px-4 py-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
            {t("settings.security")}
          </h2>
          
          {/* Biometric */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{t("settings.biometric")}</p>
                <p className="text-sm text-muted-foreground">{t("settings.biometricDesc")}</p>
              </div>
            </div>
            <Switch
              checked={biometric}
              onCheckedChange={handleBiometricToggle}
            />
          </div>

          {/* Change Password */}
          <button
            onClick={() => setPasswordDialogOpen(true)}
            className="flex items-center gap-3 w-full p-4 hover:bg-secondary/50 transition-colors"
          >
            <Lock className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">{t("settings.changePassword")}</span>
          </button>
        </section>

        {/* Data & Privacy */}
        <section className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="px-4 py-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
            {t("settings.dataPrivacy")}
          </h2>

          <button
            onClick={() => navigate("/privacy-policy")}
            className="flex items-center gap-3 w-full p-4 hover:bg-secondary/50 transition-colors"
          >
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">{t("settings.privacyPolicy")}</span>
          </button>
        </section>

        {/* Logout Section */}
        <section className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <button
            onClick={() => setLogoutDialogOpen(true)}
            className="flex items-center gap-3 w-full p-4 hover:bg-secondary/50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">{t("profile.logout")}</span>
          </button>
        </section>

        {/* Danger Zone */}
        <section className="bg-destructive/5 rounded-xl border border-destructive/20 overflow-hidden animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h2 className="px-4 py-3 text-sm font-semibold text-destructive uppercase tracking-wide border-b border-destructive/20">
            {t("settings.dangerZone")}
          </h2>
          
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="flex items-center gap-3 w-full p-4 hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-destructive" />
            <div className="text-left">
              <p className="font-medium text-destructive">{t("settings.deleteAccount")}</p>
              <p className="text-sm text-destructive/70">{t("settings.deleteAccountDesc")}</p>
            </div>
          </button>
        </section>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.changePassword")}</DialogTitle>
            <DialogDescription>
              {t("settings.changePasswordDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("settings.currentPassword")}</Label>
              <Input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.newPassword")}</Label>
              <Input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.confirmPassword")}</Label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handlePasswordChange}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">{t("settings.deleteAccount")}</DialogTitle>
            <DialogDescription>
              {t("settings.deleteAccountConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              {t("settings.deleteAccount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.logout")}</DialogTitle>
            <DialogDescription>
              {t("settings.logoutConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleLogout}>
              {t("profile.logout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
