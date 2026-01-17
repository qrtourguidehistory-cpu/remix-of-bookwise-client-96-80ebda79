import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler";
import { useBackButton } from "@/hooks/useBackButton";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import { useThemeInitializer } from "@/hooks/useThemeInitializer";
import { usePushNotificationNavigation } from "@/hooks/usePushNotificationNavigation";
import { Loader2 } from "lucide-react";
import { EarlyArrivalHandler } from "@/components/appointments/EarlyArrivalHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load all pages for better performance
const SplashScreen = lazy(() => import("./pages/auth/SplashScreen"));
const WelcomeScreen = lazy(() => import("./pages/auth/WelcomeScreen"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const OTPVerification = lazy(() => import("./pages/auth/OTPVerification"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const EmailAuthPage = lazy(() => import("./pages/auth/EmailAuthPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));

// Main pages - lazy loaded
const Index = lazy(() => import("./pages/Index"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const BusinessProfile = lazy(() => import("./pages/BusinessProfile"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const AppointmentsPage = lazy(() => import("./pages/AppointmentsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PersonalInfoPage = lazy(() => import("./pages/PersonalInfoPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const HelpSupportPage = lazy(() => import("./pages/HelpSupportPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const NotificationDetailPage = lazy(() => import("./pages/NotificationDetailPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

// Component to initialize theme on mount
const ThemeInitializer = ({ children }: { children: React.ReactNode }) => {
  useThemeInitializer();
  return <>{children}</>;
};

// Component to initialize native navigation handlers
const NativeNavigationHandler = ({ children }: { children: React.ReactNode }) => {
  useBackButton();
  useDeepLinks();
  usePushNotificationNavigation();
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NativeNavigationHandler>
              <AuthProvider>
                <AuthRedirectHandler />
                <NotificationsProvider>
                  <EarlyArrivalHandler />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Auth Routes */}
                      <Route path="/splash" element={<SplashScreen />} />
                      <Route path="/welcome" element={<WelcomeScreen />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/auth/verify" element={<OTPVerification />} />
                      <Route path="/auth/register" element={<RegisterPage />} />
                      <Route path="/auth/email" element={<EmailAuthPage />} />
                      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

                      {/* Protected Routes */}
                      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                      <Route path="/business/:id" element={<ProtectedRoute><BusinessProfile /></ProtectedRoute>} />
                      <Route path="/booking/:id" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
                      <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                      <Route path="/profile/personal" element={<ProtectedRoute><PersonalInfoPage /></ProtectedRoute>} />
                      <Route path="/profile/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                      <Route path="/profile/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                      <Route path="/profile/help" element={<ProtectedRoute><HelpSupportPage /></ProtectedRoute>} />
                      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
                      <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                      <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
                      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsOfServicePage />} />
                      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                      <Route path="/notifications/:id" element={<ProtectedRoute><NotificationDetailPage /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </NotificationsProvider>
              </AuthProvider>
            </NativeNavigationHandler>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeInitializer>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
