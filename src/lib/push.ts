import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { usePushPermissionStore } from '@/stores/pushPermission';

import { api } from './api';
import { tokenStorage } from './storage';

/**
 * Foreground behaviour: show the banner + play sound even while the app is open
 * (so a customer sees a status change without leaving the current screen).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId
  );
}

/**
 * Requests permission, fetches the Expo push token, and registers it with the
 * server. Safe to call on every authenticated launch — registration is
 * idempotent server-side. No-ops (with a warning) if the project has no EAS
 * projectId yet (`eas init`) or permission is denied, so it never blocks the UI.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Constants.isDevice && Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      // Silently returning left the user with no idea push was off and no
      // path back to Settings. Surface it via a dismissible in-app banner.
      usePushPermissionStore.getState().setDenied(true);
      return;
    }
    usePushPermissionStore.getState().setDenied(false);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Yaqin Market',
        importance: Notifications.AndroidImportance.HIGH,
        // Show notification content on lock screen (PUBLIC = show fully)
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0046AD',
        showBadge: true,
      });
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      console.warn('[push] No EAS projectId — run `eas init` to enable push tokens');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const access = await tokenStorage.getAccess();
    if (access) {
      await api.post('/users/me/devices', { token, platform: Platform.OS });
    } else {
      await api.post('/devices/anonymous', { token, platform: Platform.OS });
    }
  } catch (err) {
    console.warn('[push] register failed:', (err as Error).message);
  }
}

/**
 * Unlink this device's push token from the account on logout. Must be called
 * BEFORE the auth tokens are cleared (the request needs the still-valid
 * access token). On a shared device, skipping this left the device receiving
 * the just-logged-out user's pushes (shown in full on the lock screen) until
 * a different user logged in and re-linked the token.
 */
export async function unregisterPush(): Promise<void> {
  try {
    const projectId = resolveProjectId();
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.delete('/users/me/devices', { data: { token } });
  } catch (err) {
    console.warn('[push] unregister failed:', (err as Error).message);
  }
}

/** Matches the id shapes we ever hand out (UUIDs) — rejects anything else before it lands in a route path. */
const isSafeId = (v: string): boolean => /^[a-zA-Z0-9_-]{1,64}$/.test(v);

/**
 * Navigate to the correct in-app screen when the user taps a notification.
 * Call this in a `Notifications.addNotificationResponseReceivedListener`.
 */
export function routeFromNotificationData(
  data: Record<string, unknown>,
  push: (href: string) => void,
): void {
  const kind = typeof data.kind === 'string' ? data.kind : 'general';
  const rawOrderId = typeof data.orderId === 'string' ? data.orderId : undefined;
  const orderId = rawOrderId && isSafeId(rawOrderId) ? rawOrderId : undefined;
  const rawDeepLink = typeof data.deepLink === 'string' ? data.deepLink : undefined;
  // Only ever navigate to a relative in-app path — never an absolute
  // URL/protocol a malformed or spoofed push payload could smuggle in.
  const deepLink = rawDeepLink && rawDeepLink.startsWith('/') && !rawDeepLink.startsWith('//') ? rawDeepLink : undefined;
  const forSeller = data.forSeller === true;

  if (deepLink) {
    push(deepLink);
  } else if (kind === 'chat' && orderId) {
    push(`/chat/${orderId}`);
  } else if (kind.startsWith('order') && forSeller && orderId) {
    push(`/seller/order/${orderId}`);
  } else if (kind.startsWith('order') && orderId) {
    push(`/orders/${orderId}`);
  } else {
    push('/notifications');
  }
}
