import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Star, Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from 'react-i18next';
import welcomeBackground from '@/assets/welcome-background.jpg';

const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const slides = [
    {
      icon: Calendar,
      title: t('auth.welcome.slide1Title', 'Reserva en Segundos'),
      description: t('auth.welcome.slide1Description', 'Encuentra y reserva citas con tus negocios favoritos en solo unos toques')
    },
    {
      icon: Star,
      title: t('auth.welcome.slide2Title', 'Descubre los Mejores Lugares'),
      description: t('auth.welcome.slide2Description', 'Explora salones, spas y centros de bienestar mejor valorados cerca de ti')
    },
    {
      icon: Clock,
      title: t('auth.welcome.slide3Title', 'Nunca Pierdas una Cita'),
      description: t('auth.welcome.slide3Description', 'Recibe recordatorios y gestiona todas tus reservas en un solo lugar')
    },
    {
      icon: Users,
      title: t('auth.welcome.slide4Title', 'Únete a la Comunidad'),
      description: t('auth.welcome.slide4Description', 'Conecta con miles de usuarios y negocios verificados')
    }
  ];

  const handleContinue = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/auth');
    }
  };

  const handleSkip = () => {
    navigate('/auth');
  };

  return (
    <div 
      className="min-h-screen min-h-dvh relative overflow-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${welcomeBackground})`,
          backgroundPosition: 'center 30%'
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen min-h-dvh flex flex-col">
        {/* Header */}
        <div 
          className="flex justify-between items-center p-6"
          style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-2">
            <img 
              src="/favicon.svg" 
              alt="Bookwise Logo" 
              className="w-10 h-10 rounded-xl"
            />
            <span className="text-white font-semibold text-xl">Bookwise</span>
          </div>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            {t('common.skip', 'Omitir')}
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Icon */}
              <div className="mx-auto mb-8 w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20">
                {(() => {
                  const Icon = slides[currentSlide].icon;
                  return <Icon className="w-12 h-12 text-white" />;
                })()}
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-white mb-4">
                {slides[currentSlide].title}
              </h2>

              {/* Description */}
              <p className="text-white/70 text-lg max-w-xs mx-auto">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex gap-2 mt-12">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Section - Always visible */}
        <div 
          className="p-6 space-y-4"
          style={{ 
            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
            paddingTop: 'env(safe-area-inset-top, 0px)'
          }}
        >
          {/* Terms Checkbox - Always visible */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className="mt-0.5 border-white/50 data-[state=checked]:bg-black data-[state=checked]:border-black"
              />
              <span className="text-sm text-white/80 leading-relaxed">
                {t('auth.welcome.termsText', 'Al continuar, aceptas nuestros')}{' '}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/terms');
                  }}
                  className="text-white hover:underline font-medium"
                >
                  {t('auth.welcome.termsLink', 'Términos de Servicio')}
                </button>{' '}
                {t('common.and', 'y')}{' '}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/privacy');
                  }}
                  className="text-white hover:underline font-medium"
                >
                  {t('auth.welcome.privacyLink', 'Política de Privacidad')}
                </button>
              </span>
            </label>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={!acceptedTerms}
            className="w-full h-14 bg-black hover:bg-black/80 text-white font-semibold text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentSlide === slides.length - 1 
              ? t('auth.welcome.getStarted', 'Comenzar') 
              : t('common.continue', 'Continuar')}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
