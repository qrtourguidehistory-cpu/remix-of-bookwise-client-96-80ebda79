import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PersonalInfoPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile, updateProfile, refetchProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  // Load profile data from Supabase
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
      });
      setAvatarUrl(profile.avatar_url || "");
    } else if (user) {
      // Fallback to user email if profile doesn't exist yet
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: t("common.error"),
        description: "Debes iniciar sesión para guardar cambios",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      
      const { error } = await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        full_name: fullName,
        email: formData.email,
        phone: formData.phone,
        avatar_url: avatarUrl,
      });

      if (error) throw error;
      
      // Refetch profile to ensure UI is updated with latest data
      await refetchProfile();
      
      toast({
        title: t("common.success"),
        description: "Tus datos han sido guardados correctamente.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: t("common.error"),
        description: error.message || "No se pudieron guardar los cambios.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("common.error"),
        description: "La imagen debe ser menor a 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("common.error"),
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      // Use user ID as folder to match RLS policy
      const filePath = `avatars/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('Logos')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      // Save to profile immediately
      const { error: updateError } = await updateProfile({ avatar_url: publicUrl });
      if (updateError) throw updateError;
      
      // Refetch profile to ensure UI is updated
      await refetchProfile();
      
      toast({
        title: t("common.success"),
        description: "Foto de perfil actualizada",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: t("common.error"),
        description: error.message || "No se pudo subir la imagen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    return initials || "U";
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
            <h1 className="text-lg font-semibold text-foreground">{t("profile.personalInfo")}</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">Debes iniciar sesión para ver tu perfil</p>
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
          <h1 className="text-lg font-semibold text-foreground">{t("profile.personalInfo")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <section className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-coral-light text-coral text-2xl">
                {getInitials(formData.first_name, formData.last_name)}
              </AvatarFallback>
            </Avatar>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-coral rounded-full flex items-center justify-center shadow-lg hover:bg-coral-dark transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-coral-foreground animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-coral-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground">{t("common_ui.tapToChangePhoto")}</p>
        </section>

        {/* Form */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="space-y-2">
            <Label htmlFor="first_name" className="flex items-center gap-2">
              <User className="w-4 h-4 text-coral" />
              {t("profile.firstName")}
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder={t("profile.firstNamePlaceholder")}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="flex items-center gap-2">
              <User className="w-4 h-4 text-coral" />
              {t("profile.lastName")}
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder={t("profile.lastNamePlaceholder")}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-coral" />
              {t("booking.email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tu@email.com"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-coral" />
              {t("booking.phone")}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 809 555 0000"
              maxLength={20}
            />
          </div>
        </section>

        {/* Save Button */}
        <section className="pt-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Button 
            variant="coral" 
            size="xl" 
            className="w-full" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              t("common.save")
            )}
          </Button>
        </section>
      </main>
    </div>
  );
};

export default PersonalInfoPage;
