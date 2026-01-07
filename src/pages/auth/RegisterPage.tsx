import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    // Validate form
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!acceptTerms) {
      toast.error('Please accept the Terms of Use and Privacy Policy');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(formData.email, formData.password, {
      first_name: formData.firstName,
      last_name: formData.lastName,
    });

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
      setIsLoading(false);
    } else {
      toast.success('Account created! Please check your email to verify.');
      navigate('/');
    }
  };

  const handleBack = () => {
    navigate('/auth/email');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-white flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center p-4 border-b border-slate-200">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-slate-900" />
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-slate-900 pr-10">
          {t('auth.register.title', 'Create Account')}
        </h1>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="space-y-5"
        >
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-slate-900">
              {t('auth.register.firstName', 'First name')}
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder={t('auth.register.firstName', 'First name')}
              className={`h-14 text-lg rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 ${errors.firstName ? 'border-red-500' : ''}`}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-slate-900">
              {t('auth.register.lastName', 'Last name')}
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder={t('auth.register.lastName', 'Last name')}
              className={`h-14 text-lg rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 ${errors.lastName ? 'border-red-500' : ''}`}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-900">
              {t('booking.email', 'Email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@example.com"
              className={`h-14 text-lg rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-900">
              {t('auth.register.password', 'Password')}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                className={`h-14 text-lg rounded-xl pr-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 ${errors.password ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>
        </motion.div>

        {/* Checkboxes */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-8 space-y-4"
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
              {t('auth.register.agreeTerms', 'I agree to the')} {' '}
              <a href="/privacy-policy" className="text-slate-900 font-medium hover:underline">
                {t('settings.privacyPolicy', 'Privacy Policy')}
              </a> 
              {' '}&{' '}
              <a href="/terms-of-service" className="text-slate-900 font-medium hover:underline">
                {t('auth.register.termsOfUse', 'Terms of Use')}
              </a>
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="marketing"
              checked={acceptMarketing}
              onCheckedChange={(checked) => setAcceptMarketing(checked as boolean)}
              className="mt-1"
            />
            <Label htmlFor="marketing" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
              {t('auth.register.noMarketing', 'I do not wish to receive marketing notifications')}
            </Label>
          </div>
        </motion.div>
      </div>

      {/* Submit Button */}
      <div className="px-6 pb-8 pt-4 border-t border-slate-200">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-14 text-lg font-semibold rounded-xl"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            t('auth.register.continue', 'Continue')
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
