import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { tr } from '@/i18n';
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
    (action: () => void, message?: string) => {
      if (status === 'authenticated') {
        action();
        return;
      }
      Alert.alert(tr('profile.guest.title'), message ?? tr('auth.requireMessage'), [
        { text: tr('common.cancel'), style: 'cancel' },
        { text: tr('auth.loginAction'), onPress: () => router.push('/(auth)/phone') },
      ]);
    },
    [status, router],
  );
}

/** True while the user is not signed in (guest). */
export function useIsGuest(): boolean {
  return useAuthStore((s) => s.status !== 'authenticated');
}
