import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SocialButton } from '@/components/auth/SocialButton';
import { ArrowLeft, Globe, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';

const AuthPage = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, user, isLoading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();

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
        toast.error(msg, { id: 'auth-error-principal' });
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

  const handleEmailLogin = () => {
    navigate('/auth/email');
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
