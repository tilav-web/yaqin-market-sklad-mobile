import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      // Note: don't set `sound` to 'default' — expo-notifications treats any
      // string as a bundled custom sound file and warns if it's missing. Omit
      // it to use the system default tone.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Yaqin Market',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      console.warn('[push] No EAS projectId — run `eas init` to enable push tokens');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    // When signed in, register + LINK the token to the user; otherwise register
    // it anonymously so the device still receives broadcast notifications. On
    // the next sign-in this same token gets linked to the account.
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
