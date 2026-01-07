import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const SplashScreen = () => {
  const navigate = useNavigate();
  const { user, isLoading, isGuest } = useAuth();
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && progress >= 100) {
      const timeout = setTimeout(() => {
        if (user || isGuest) {
          navigate('/', { replace: true });
        } else {
          navigate('/welcome', { replace: true });
        }
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [isLoading, progress, user, isGuest, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-white flex flex-col items-center justify-center px-8"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-8"
      >
        <div className="w-28 h-28 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl">
          <span className="text-white text-5xl font-bold">B</span>
        </div>
        {/* Shadow effect below logo */}
        <div className="w-20 h-3 mx-auto mt-4 bg-slate-200 rounded-full blur-md" />
      </motion.div>

      {/* App Name */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-slate-900 text-4xl font-bold mb-3"
      >
        Bookwise
      </motion.h1>

      {/* Slogan */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-slate-500 text-lg text-center mb-20 max-w-xs"
      >
        {t('auth.splash.slogan', 'Agenda tu cita al instante sin hacer fila')}
      </motion.p>

      {/* Progress Bar */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: '50%', opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="h-1 bg-slate-200 rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-slate-900 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
