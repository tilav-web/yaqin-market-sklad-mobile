import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useAuthStore } from '@/stores/auth';

/**
 * Guard for actions that need a real account (placing an order, opening a shop,
 * joining as staff). If signed in it runs `action`; otherwise it prompts the
 * guest to log in and sends them to the phone screen. Browsing, the cart, the
 * map and language stay open to everyone.
 */
export function useRequireAuth() {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  return useCallback(
    (action: () => void, message = 'Bu amal uchun tizimga kirishingiz kerak') => {
      if (status === 'authenticated') {
        action();
        return;
      }
      Alert.alert('Tizimga kirish', message, [
        { text: 'Bekor', style: 'cancel' },
        { text: 'Kirish', onPress: () => router.push('/(auth)/phone') },
      ]);
    },
    [status, router],
  );
}

/** True while the user is not signed in (guest). */
export function useIsGuest(): boolean {
  return useAuthStore((s) => s.status !== 'authenticated');
}
