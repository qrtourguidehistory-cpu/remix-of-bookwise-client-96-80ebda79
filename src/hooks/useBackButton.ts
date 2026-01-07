import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// Routes that should exit the app when back button is pressed
const EXIT_ROUTES = ['/', '/welcome'];

// Auth routes - pressing back should go to welcome, not previous auth steps
const AUTH_ROUTES = ['/auth', '/auth/email', '/auth/verify', '/auth/register', '/auth/forgot-password'];

// Main navigation routes - should not go back to auth
const MAIN_ROUTES = ['/', '/search', '/appointments', '/profile'];

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackButton = useCallback(async () => {
    const currentPath = location.pathname;

    // If on exit routes, minimize or exit app
    if (EXIT_ROUTES.includes(currentPath)) {
      try {
        const { App } = await import('@capacitor/app');
        await App.minimizeApp();
      } catch (error) {
        console.error('Failed to minimize app:', error);
      }
      return;
    }

    // If on main navigation routes, don't allow going back to auth
    if (MAIN_ROUTES.includes(currentPath)) {
      try {
        const { App } = await import('@capacitor/app');
        await App.minimizeApp();
      } catch (error) {
        console.error('Failed to minimize app:', error);
      }
      return;
    }

    // If on any auth route, go to welcome and clear auth history
    if (AUTH_ROUTES.some(route => currentPath.startsWith(route))) {
      navigate('/welcome', { replace: true });
      return;
    }

    // For nested routes in booking flow, go back one step
    if (currentPath.startsWith('/booking/')) {
      navigate(-1);
      return;
    }

    // For business profile, go to search or home
    if (currentPath.startsWith('/business/')) {
      navigate('/search', { replace: true });
      return;
    }

    // For profile sub-pages, go back to profile
    if (currentPath.startsWith('/profile/')) {
      navigate('/profile', { replace: true });
      return;
    }

    // Default: try to go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonListener: any = null;

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        
        backButtonListener = await App.addListener('backButton', ({ canGoBack }) => {
          handleBackButton();
        });
      } catch (error) {
        console.error('Failed to setup back button handler:', error);
      }
    };

    setupBackButton();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [handleBackButton]);
};
