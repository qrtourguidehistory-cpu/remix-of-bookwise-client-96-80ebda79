import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SocialButton } from '@/components/auth/SocialButton';
import { PhoneInput, countries } from '@/components/auth/PhoneInput';
import { Country } from '@/components/auth/CountrySelector';
import { ArrowLeft, Globe, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';

const AuthPage = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithApple, signInWithPhone, user, isLoading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();

  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find(c => c.code === 'DO') || countries[0]
  );
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Navigate to home when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading('google');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        const msg = error.message || 'Failed to sign in with Google';
        // Detect reauth requirement and fallback to web OAuth deep link
        if (msg.includes('[16]') || msg.toLowerCase().includes('reauth')) {
          toast('Se requiere reautenticación; abriendo flujo de Google en navegador...', { id: 'reauth-notificacion' });
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const redirectTo = 'com.miturnow.cliente://login-callback';
            console.log('🔐 Usando redirectTo (AuthPage fallback):', redirectTo);
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo, skipBrowserRedirect: true },
            });
            if (oauthError) {
              toast.error(oauthError.message || 'Failed to open Google OAuth fallback', { id: 'oauth-error-google' });
            } else if (data?.url) {
              const { Browser } = await import('@capacitor/browser');
              await Browser.open({ url: data.url });
              console.log('🔐 OAuth web fallback abierto');
            } else {
              toast.error('No se pudo generar URL de OAuth web', { id: 'oauth-error-url' });
            }
          } catch (fallbackErr) {
            console.error('Fallback a OAuth web falló:', fallbackErr);
            toast.error('Fallback a OAuth web falló', { id: 'oauth-error-fallback' });
          }
        } else {
          toast.error(msg, { id: 'auth-error-principal' });
        }
        setIsLoading(null);
      } else {
        // OAuth flow started - browser will open
        // Don't show success yet, wait for deep link callback to establish session
        // The useEffect will handle navigation when user state updates
        // The success message will come from the deep link handler if needed
        console.log('🔐 OAuth iniciado, esperando callback de deep link...');
      }
    } catch (error) {
      toast.error('An unexpected error occurred', { id: 'google-auth-error-unexpected' });
      setIsLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading('apple');
    try {
      const { error } = await signInWithApple();
      if (error) {
        toast.error(error.message || 'Failed to sign in with Apple', { id: 'apple-auth-error' });
        setIsLoading(null);
      } else {
        // OAuth flow started - browser will open
        // Don't show success yet, wait for deep link callback to establish session
        // The useEffect will handle navigation when user state updates
        console.log('🍎 OAuth iniciado, esperando callback de deep link...');
      }
    } catch (error) {
      toast.error('An unexpected error occurred', { id: 'apple-auth-error-unexpected' });
      setIsLoading(null);
    }
  };

  const handleEmailLogin = () => {
    navigate('/auth/email');
  };

  const handlePhoneContinue = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid phone number', { id: 'phone-validation-error' });
      return;
    }

    setIsLoading('phone');
    const fullPhone = `${selectedCountry.dialCode}${phone.replace(/\D/g, '')}`;
    
    const { error } = await signInWithPhone(fullPhone);
    if (error) {
      toast.error(error.message || 'Failed to send verification code', { id: 'phone-send-error' });
      setIsLoading(null);
    } else {
      navigate('/auth/verify', { state: { phone: fullPhone } });
    }
  };

  const handleBack = () => {
    navigate('/welcome');
  };

  const changeLanguage = () => {
    const languages = ['en', 'es', 'fr'];
    const currentIndex = languages.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen min-h-dvh bg-white flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)' 
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-slate-900" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <h1 className="text-slate-900 text-2xl font-bold mb-2">
            {t('auth.login.title', 'Log in or sign up')}
          </h1>
          <p className="text-slate-600 mb-8">
            {t('auth.login.subtitle', 'Create an account or log in to book appointments')}
          </p>
        </motion.div>

        {/* Social Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="space-y-3 mb-8"
        >
          <SocialButton
            provider="apple"
            onClick={handleAppleLogin}
            isLoading={isLoading === 'apple'}
          />
          <SocialButton
            provider="google"
            onClick={handleGoogleLogin}
            isLoading={isLoading === 'google'}
          />
          <SocialButton
            provider="email"
            onClick={handleEmailLogin}
            isLoading={isLoading === 'email'}
          />
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-500">
              {t('auth.login.or', 'OR')}
            </span>
          </div>
        </motion.div>

        {/* Phone Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="space-y-4"
        >
          <PhoneInput
            value={phone}
            onChange={setPhone}
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
            placeholder={t('auth.login.enterPhone', 'Phone number')}
          />

          <Button
            onClick={handlePhoneContinue}
            disabled={!phone || isLoading === 'phone'}
            className="w-full h-14 text-lg font-semibold rounded-xl"
          >
            {isLoading === 'phone' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              t('auth.welcome.continue', 'Continue')
            )}
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="px-6"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={changeLanguage}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Globe className="h-5 w-5" />
            <span>{i18n.language.toUpperCase()}</span>
          </button>
          <button className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <HelpCircle className="h-5 w-5" />
            <span>{t('auth.login.support', 'Support')}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AuthPage;
