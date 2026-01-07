import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { OTPInput } from '@/components/auth/OTPInput';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, signInWithPhone } = useAuth();
  const { t } = useTranslation();

  const phone = location.state?.phone || '';
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!phone) {
      navigate('/auth');
      return;
    }

    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown, phone, navigate]);

  const handleComplete = async (code: string) => {
    setIsLoading(true);
    const { error } = await verifyOTP(phone, code);
    
    if (error) {
      toast.error(error.message || 'Invalid verification code');
      setOtp('');
      setIsLoading(false);
    } else {
      toast.success('Phone verified successfully!');
      navigate('/');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setCountdown(30);
    
    const { error } = await signInWithPhone(phone);
    if (error) {
      toast.error(error.message || 'Failed to resend code');
      setCanResend(true);
    } else {
      toast.success('Verification code sent!');
    }
  };

  const handleBack = () => {
    navigate('/auth');
  };

  const handleChangeNumber = () => {
    navigate('/auth');
  };

  const formatPhone = (phoneNumber: string) => {
    // Format phone number for display
    if (phoneNumber.length >= 10) {
      const cleaned = phoneNumber.replace(/\D/g, '');
      const last10 = cleaned.slice(-10);
      return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
    }
    return phoneNumber;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center p-4">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-foreground text-2xl font-bold mb-2">
            {t('auth.otp.title', 'Enter the 4-digit code sent to')}
          </h1>
          <p className="text-foreground font-medium text-lg">
            {formatPhone(phone)}
          </p>
          <button
            onClick={handleChangeNumber}
            className="text-primary mt-2 hover:underline"
          >
            {t('auth.otp.changeNumber', 'Changed your mobile number?')}
          </button>
        </motion.div>

        {/* OTP Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-8"
        >
          <OTPInput
            value={otp}
            onChange={setOtp}
            onComplete={handleComplete}
            disabled={isLoading}
          />
        </motion.div>

        {/* Resend Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center"
        >
          {canResend ? (
            <Button
              variant="ghost"
              onClick={handleResend}
              className="text-primary hover:text-primary/80"
            >
              {t('auth.otp.resend', 'Resend code via SMS')}
            </Button>
          ) : (
            <p className="text-muted-foreground">
              {t('auth.otp.resendIn', 'Resend in')} 0:{countdown.toString().padStart(2, '0')}
            </p>
          )}
        </motion.div>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center mt-8"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </motion.div>
        )}
      </div>

      {/* Bottom Button */}
      <div className="px-6 pb-8">
        <Button
          onClick={() => handleComplete(otp)}
          disabled={otp.length !== 4 || isLoading}
          className="w-full h-14 text-lg font-semibold rounded-xl"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
          ) : (
            t('common.confirm', 'Confirm')
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default OTPVerification;
