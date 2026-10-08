import { QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { BellOff, WifiOff, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { colors, layout, radius, spacing, typography } from '@/theme';

/** Modern floating offline toast banner */
function OfflineBanner() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { tr } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (dismissed) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await hydrate();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={styles.modernBannerCard}>
      <View style={styles.bannerIconBadge}>
        <WifiOff size={15} color={colors.brand.primary} strokeWidth={2.4} />
      </View>
      <View style={styles.bannerTextWrap}>
        <Text style={styles.bannerTitle}>Internet aloqasi yo'q</Text>
        <Text style={styles.bannerSubtitle}>{tr('common.error.desc')}</Text>
      </View>
      <Pressable
        onPress={handleRetry}
        style={styles.retryBtn}
        hitSlop={6}
        disabled={retrying}>
        {retrying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.retryBtnText}>{tr('common.retry')}</Text>
        )}
      </Pressable>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8} style={styles.bannerCloseBtn}>
        <X size={15} color="#9CA3AF" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

/** Shown when push notification permission is denied — otherwise the user has
 * no idea push is off and no path back to Settings to re-enable it. */
function PushPermissionBanner() {
  const { tr } = useTranslation();
  const dismiss = usePushPermissionStore((s) => s.dismiss);
  return (
    <View style={styles.bannerCard}>
      <BellOff size={16} color={colors.feedback.warning} strokeWidth={2.4} />
      <Text style={styles.bannerText}>
        {tr('push.disabled')}
      </Text>
      <Pressable onPress={() => void Linking.openSettings()} hitSlop={8}>
        <Text style={styles.bannerAction}>{tr('imgUp.openSettings')}</Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={8}>
        <X size={16} color={colors.feedback.warning} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

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
      <View style={[styles.loading, { backgroundColor: activeColors.bg.surface }]}>
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
          style={[styles.bannerStack, { top: insets.top + spacing.sm }]}
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
        <Stack.Screen name="shops" options={{ title: tr('home.nearbyShops') }} />
        <Stack.Screen name="product/[id]" options={{ title: tr('nav.product') }} />
        <Stack.Screen name="shop/[id]/index" options={{ title: tr('nav.shop') }} />
        <Stack.Screen name="shop/[id]/checkout" options={{ title: tr('cart.proceed') }} />
        <Stack.Screen name="orders/index" options={{ title: tr('orders.title') }} />
        <Stack.Screen name="orders/[id]" options={{ title: tr('nav.orderDetail') }} />
        <Stack.Screen name="orders/tracking" options={{ title: tr('tracking.title') }} />
        <Stack.Screen name="chat/[orderId]" options={{ title: tr('nav.chat') }} />
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
  },
  bannerStack: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 999,
  },
  modernBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 57, 46, 0.4)',
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  bannerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(232, 57, 46, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
    gap: 1,
  },
  bannerTitle: {
    ...typography.caption,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerSubtitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  retryBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  retryBtnText: {
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerCloseBtn: {
    padding: 4,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.feedback.warningSurface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.feedback.warning,
    maxWidth: '92%',
  },
  bannerText: { ...typography.caption, color: colors.feedback.warning, fontWeight: '600', flexShrink: 1 },
  bannerAction: { ...typography.caption, color: colors.feedback.warning, fontWeight: '800' },
});
