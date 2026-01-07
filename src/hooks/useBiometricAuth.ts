import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface BiometricResult {
  isAvailable: boolean;
  biometryType: 'touchId' | 'faceId' | 'fingerprint' | 'face' | 'none';
}

export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async (): Promise<BiometricResult> => {
    if (!Capacitor.isNativePlatform()) {
      setIsLoading(false);
      return { isAvailable: false, biometryType: 'none' };
    }

    try {
      // Dynamic import for native platforms only
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      const result = await NativeBiometric.isAvailable();
      setIsAvailable(result.isAvailable);
      setBiometryType(String(result.biometryType));
      setIsLoading(false);
      
      return {
        isAvailable: result.isAvailable,
        biometryType: String(result.biometryType) as BiometricResult['biometryType'],
      };
    } catch (error) {
      console.error('Biometric check failed:', error);
      setIsLoading(false);
      return { isAvailable: false, biometryType: 'none' };
    }
  };

  const authenticate = useCallback(async (reason?: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Biometric auth not available in browser');
      return false;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.verifyIdentity({
        reason: reason || 'Autenticación para continuar',
        title: 'Bookwise',
        subtitle: 'Autenticación biométrica',
        description: 'Coloca tu dedo en el sensor o mira tu dispositivo',
      });
      
      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }, []);

  const setCredentials = useCallback(async (username: string, password: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.setCredentials({
        username,
        password,
        server: 'bookwise.app',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to set credentials:', error);
      return false;
    }
  }, []);

  const getCredentials = useCallback(async (): Promise<{ username: string; password: string } | null> => {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      const credentials = await NativeBiometric.getCredentials({
        server: 'bookwise.app',
      });
      
      return {
        username: credentials.username,
        password: credentials.password,
      };
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return null;
    }
  }, []);

  const deleteCredentials = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      
      await NativeBiometric.deleteCredentials({
        server: 'bookwise.app',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete credentials:', error);
      return false;
    }
  }, []);

  return {
    isAvailable,
    biometryType,
    isLoading,
    authenticate,
    setCredentials,
    getCredentials,
    deleteCredentials,
    checkBiometricAvailability,
  };
};
