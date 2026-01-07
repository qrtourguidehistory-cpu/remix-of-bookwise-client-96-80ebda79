import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const EmailAuthPage = () => {
  const navigate = useNavigate();
  const { signInWithEmail } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    const result = loginSchema.safeParse({ email, password });
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

    setIsLoading(true);
    const { error } = await signInWithEmail(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message || 'Failed to sign in');
      }
      setIsLoading(false);
    } else {
      toast.success('Signed in successfully!');
      navigate('/');
    }
  };

  const handleBack = () => {
    navigate('/auth');
  };

  const handleCreateAccount = () => {
    navigate('/auth/register');
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
          Email
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100">
            <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">{t('auth.login.signIn', 'Sign In')}</TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600">{t('auth.login.signUp', 'Sign Up')}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="space-y-5"
            >
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-900">
                  {t('booking.email', 'Email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
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
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading && email && password) {
                        e.preventDefault();
                        handleLogin();
                      }
                    }}
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

              {/* Forgot Password */}
              <div className="text-right">
                <button 
                  onClick={() => navigate('/auth/forgot-password')}
                  className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                >
                  {t('auth.login.forgotPassword', 'Forgot password?')}
                </button>
              </div>

              {/* Login Button */}
              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-14 text-lg font-semibold rounded-xl"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  t('auth.login.signIn', 'Sign In')
                )}
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="signup">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-center py-8"
            >
              <p className="text-slate-600 mb-6">
                {t('auth.register.createAccountDesc', 'Create an account to book appointments and manage your bookings')}
              </p>
              <Button
                onClick={handleCreateAccount}
                className="w-full h-14 text-lg font-semibold rounded-xl"
              >
                {t('auth.register.title', 'Create Account')}
              </Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default EmailAuthPage;
