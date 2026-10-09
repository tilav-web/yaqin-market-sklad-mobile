import '../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { PushPermissionBanner } from '@/components/layout/PushPermissionBanner';
import { RealtimeBridge } from '@/components/RealtimeBridge';
import { ToastProvider } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
// Side-effect import: registers the background courier-location task via
// TaskManager.defineTask. Must run on every app launch — including a
// headless relaunch the OS performs just to deliver a background location
// update — so it belongs at the root, not lazily inside the courier's order
// screen (which may never mount before the OS needs the task to exist).
import '@/lib/courier-location-task';
import { registerForPush, routeFromNotificationData } from '@/lib/push';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import { usePushPermissionStore } from '@/stores/pushPermission';
import { useTheme } from '@/stores/theme';
import { colors } from '@/theme';

function RootNavigator() {
  const { isDark, colors: activeColors } = useTheme();
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const pushDenied = usePushPermissionStore((s) => s.denied);
  const pushDismissed = usePushPermissionStore((s) => s.dismissed);
  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tr } = useTranslation();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Register this device for push on launch — anonymously if not signed in, so
  // even logged-out users can receive broadcast notifications. RealtimeBridge
  // re-registers (and links the token) once the user is authenticated.
  useEffect(() => {
    if (status !== 'loading') void registerForPush();
  }, [status]);

  // Handle notification taps (app in background or killed).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      routeFromNotificationData(data, (href) => router.push(href as Parameters<typeof router.push>[0]));
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    // Guest mode: unauthenticated users browse freely (products, shops, map,
    // language, notifications, cart). We only bounce OUT of the auth screens
    // once login succeeds. Protected actions call requireAuth() to open login.
    if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: activeColors.bg.surface }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const showOffline = status === 'offline';
  const showPushNotice = pushDenied && !pushDismissed;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={activeColors.bg.surface}
      />
      {status === 'authenticated' && <RealtimeBridge />}
      {(showOffline || showPushNotice) && (
        <View
          className="absolute left-4 right-4 items-center gap-2 z-[999]"
          style={{ top: insets.top + 8 }}
          pointerEvents="box-none">
          {showOffline && <OfflineBanner />}
          {showPushNotice && <PushPermissionBanner />}
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: activeColors.bg.surface },
          headerTintColor: activeColors.text.primary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: activeColors.bg.canvas },
        }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: tr('nav.product') }} />
        <Stack.Screen name="shop/[id]/index" options={{ title: tr('nav.shop') }} />
        <Stack.Screen name="shop/[id]/checkout" options={{ title: tr('cart.proceed') }} />
        <Stack.Screen name="orders/index" options={{ title: tr('orders.title') }} />
        <Stack.Screen name="orders/[id]" options={{ title: tr('nav.orderDetail') }} />
        <Stack.Screen name="orders/tracking" options={{ title: tr('tracking.title') }} />
        <Stack.Screen name="chat/[orderId]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: tr('notifications.title') }} />
        <Stack.Screen name="notification/[id]" options={{ title: tr('nav.notificationDetail') }} />
        <Stack.Screen name="addresses" options={{ title: tr('addr.title') }} />
        <Stack.Screen name="saved-cards" options={{ title: tr('cards.title') }} />
        <Stack.Screen name="add-card" options={{ title: tr('cards.addTitle') }} />
        <Stack.Screen name="profile/edit" options={{ title: tr('editProfile.title') }} />
        <Stack.Screen name="profile/delete-account" options={{ title: tr('deleteAccount.title') }} />
        <Stack.Screen name="staff-scan" options={{ headerShown: false }} />
        <Stack.Screen name="seller-application" options={{ title: tr('sellerApp.title') }} />
        <Stack.Screen name="seller/new" options={{ title: tr('nav.newShop') }} />
        <Stack.Screen name="seller/[shopId]" options={{ headerShown: false }} />
        <Stack.Screen name="seller/return/[orderId]" options={{ title: tr('nav.returnItems') }} />
        <Stack.Screen name="seller/order/[orderId]" options={{ title: tr('nav.orderDetail') }} />
        <Stack.Screen name="seller/pos/[shopId]" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ title: tr('nav.favorites') }} />
        <Stack.Screen name="saved-messages" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
