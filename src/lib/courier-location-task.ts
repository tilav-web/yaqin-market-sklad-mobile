import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { API_URL } from './api';
import { tokenStorage } from './storage';

export const COURIER_LOCATION_TASK = 'courier-location-task';

// A courier can be delivering several orders in one trip (see
// OrdersService.getDeliveryRoute) — this holds every orderId currently being
// tracked, not just one, so the background task reports to all of them.
const ACTIVE_ORDERS_KEY = 'ym_active_delivery_order_ids';

async function getActiveOrderIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(ACTIVE_ORDERS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function setActiveOrderIds(ids: string[]): Promise<void> {
  if (ids.length === 0) await AsyncStorage.removeItem(ACTIVE_ORDERS_KEY);
  else await AsyncStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(ids));
}

/**
 * Runs while the courier's phone is locked and the app is backgrounded — a
 * separate, short-lived JS context (not the main app), so it can't rely on
 * the app's socket connection or React Query client. It does one thing: POST
 * the latest coordinate to every order currently being delivered. The server
 * fans each one out to its customer over the socket gateway (see
 * RealtimeGateway.emitToOrder).
 */
TaskManager.defineTask(COURIER_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data as { locations?: Location.LocationObject[] } | undefined) ?? {};
  const location = locations?.[locations.length - 1];
  if (!location) return;

  try {
    const [orderIds, token] = await Promise.all([getActiveOrderIds(), tokenStorage.getAccess()]);
    if (orderIds.length === 0 || !token) return;

    const body = JSON.stringify({ lat: location.coords.latitude, lng: location.coords.longitude });
    await Promise.allSettled(
      orderIds.map((orderId) =>
        fetch(`${API_URL}/api/orders/${orderId}/courier-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body,
        }),
      ),
    );
  } catch {
    // Best-effort — background execution is unreliable across OS versions,
    // the next tick (or the foreground interval, if the app comes back) will
    // simply try again. Nothing useful to do with a failure here.
  }
});

export type StartTrackingResult =
  | { ok: true }
  | { ok: false; reason: 'foreground_denied' | 'background_denied' };

/**
 * Begin reporting this courier's live location for `orderId`, in foreground
 * and background alike. Call once the order moves to `delivering`. Safe to
 * call for a second (or third) order while one is already being tracked —
 * they're all reported together. Requests "always" location permission — the
 * OS shows its own dialog, but callers should show an in-app rationale first
 * (required by both stores' review guidelines for background-location
 * disclosure).
 */
export async function startCourierTracking(orderId: string): Promise<StartTrackingResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return { ok: false, reason: 'foreground_denied' };

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return { ok: false, reason: 'background_denied' };

  const ids = await getActiveOrderIds();
  if (!ids.includes(orderId)) await setActiveOrderIds([...ids, orderId]);

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK);
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(COURIER_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 25,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Yaqin Market — yetkazib berish faol',
        notificationBody: "Joylashuvingiz mijozga ko'rsatilmoqda",
        notificationColor: '#E8392E',
      },
    });
  }

  return { ok: true };
}

/**
 * Stop reporting location for one order — call when it's delivered or
 * cancelled. Only actually tears down the background task once no order is
 * left to track (a courier finishing stop 1 of 3 should keep reporting for
 * stops 2 and 3).
 */
export async function stopCourierTracking(orderId: string): Promise<void> {
  const ids = (await getActiveOrderIds()).filter((id) => id !== orderId);
  await setActiveOrderIds(ids);

  if (ids.length === 0) {
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK);
    if (alreadyStarted) await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK);
  }
}

/** True while background tracking is active for this exact order. */
export async function isTrackingOrder(orderId: string): Promise<boolean> {
  const [ids, started] = await Promise.all([
    getActiveOrderIds(),
    Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK),
  ]);
  return started && ids.includes(orderId);
}
