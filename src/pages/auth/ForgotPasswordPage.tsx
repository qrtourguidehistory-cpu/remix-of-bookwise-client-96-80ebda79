import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: t("auth.error"),
        description: t("auth.enterEmail"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: t("auth.resetEmailSent"),
        description: t("auth.checkInbox"),
      });
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message || t("auth.resetError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/auth/email");
  };

  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
      >
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">
            {t("auth.checkYourEmail")}
          </h1>
          
          <p className="text-muted-foreground">
            {t("auth.resetEmailSentTo")} <strong>{email}</strong>
          </p>
          
          <p className="text-sm text-muted-foreground">
            {t("auth.clickLinkInEmail")}
          </p>

          <div className="space-y-3 pt-4">
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full"
            >
              {t("auth.sendAgain")}
            </Button>
            
            <Button
              onClick={() => navigate("/auth/email")}
              className="w-full"
            >
              {t("auth.backToLogin")}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
          {t("auth.forgotPassword")}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center p-6">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {t("auth.resetYourPassword")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("auth.enterEmailToReset")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
            >
              {isLoading ? t("auth.sending") : t("auth.sendResetLink")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.rememberPassword")}{" "}
            <button
              onClick={() => navigate("/auth/email")}
              className="text-primary hover:underline font-medium"
            >
              {t("auth.signIn")}
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ForgotPasswordPage;
