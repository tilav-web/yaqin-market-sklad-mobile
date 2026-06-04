import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RealtimeBridge } from '@/components/RealtimeBridge';
import { ToastProvider } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { registerForPush } from '@/lib/push';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme';

function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <>
      {status === 'authenticated' && <RealtimeBridge />}
      <Stack
        screenOptions={{
          headerShown: true,
        headerStyle: { backgroundColor: colors.bg.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg.canvas },
      }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="shops" options={{ title: tr('home.nearbyShops') }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Mahsulot' }} />
      <Stack.Screen name="shop/[id]/index" options={{ title: 'Do\'kon' }} />
      <Stack.Screen name="shop/[id]/checkout" options={{ title: tr('cart.proceed') }} />
      <Stack.Screen name="orders/index" options={{ title: tr('orders.title') }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Buyurtma' }} />
      <Stack.Screen name="chat/[orderId]" options={{ title: 'Chat' }} />
      <Stack.Screen name="notifications" options={{ title: 'Bildirishnomalar' }} />
      <Stack.Screen name="addresses" options={{ title: tr('addr.title') }} />
      <Stack.Screen name="profile/edit" options={{ title: tr('editProfile.title') }} />
      <Stack.Screen name="staff-scan" options={{ headerShown: false }} />
      <Stack.Screen name="seller-application" options={{ title: tr('sellerApp.title') }} />
      <Stack.Screen name="seller/new" options={{ title: 'Yangi do\'kon' }} />
      <Stack.Screen name="seller/[shopId]" options={{ headerShown: false }} />
      <Stack.Screen name="seller/return/[orderId]" options={{ title: 'Qaytarish' }} />
      <Stack.Screen name="seller/order/[orderId]" options={{ title: 'Buyurtma' }} />
      <Stack.Screen name="seller/pos/[shopId]" options={{ headerShown: false }} />
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
            <StatusBar barStyle="dark-content" backgroundColor={colors.bg.surface} />
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
});
