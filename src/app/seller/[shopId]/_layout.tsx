import { Tabs, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bell, Home } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SellerTabBar } from '@/components/SellerTabBar';
import type { StaffPermission } from '@/constants/staffPermissions';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { AlarmMode } from '@/stores/alarmSettings';
import { PendingOrder, useOrderAlarm } from '@/lib/useOrderAlarm';
import { useShopAccess } from '@/lib/useIsShopOwner';

// "staff" has no corresponding StaffPermission at all (managing staff is
// always owner-only server-side) — hidden for anyone who isn't the owner.
const OWNER_ONLY_ROUTES = ['staff'];

// The "settings" tab is a hub that fans out into shop-settings, promotions,
// global catalog, chat templates, stats, reviews, blocked users, balance and
// prime — some owner-only, some gated by one of these staff permissions.
// Hide the whole tab only when the user holds NONE of them (settings.tsx
// itself hides/shows each row by its own specific permission).
const HUB_PERMISSIONS: StaffPermission[] = [
  'shop.toggle_open',
  'shop.settings.view',
  'promotions.view',
  'promotions.manage',
  'reviews.view',
  'orders.chat',
  'inventory.product.create',
];

function BackButton() {
  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };
  return (
    <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
      <ArrowLeft size={22} color={Brand.white} strokeWidth={2.6} />
    </Pressable>
  );
}

function HubBackButton({ shopId }: Readonly<{ shopId: string }>) {
  return (
    <Pressable style={styles.backBtn} onPress={() => router.navigate(`/seller/${shopId}/settings`)} hitSlop={10}>
      <ArrowLeft size={22} color={Brand.white} strokeWidth={2.6} />
    </Pressable>
  );
}

// One-tap exit back to customer mode, shown on EVERY seller screen regardless
// of nesting depth. Without this, leaving from a screen reached through the
// settings hub (shop-settings, stats, blocked, reviews, balance, prime,
// promotions, catalog, chat-templates) took 2+ taps: back to the hub, then
// back to customer mode — headerLeft on those screens only returns to the hub.
function CustomerModeButton() {
  return (
    <Pressable
      style={styles.customerBtn}
      onPress={() => router.replace('/(tabs)/profile')}
      hitSlop={10}
      accessibilityLabel="Customer rejimga qaytish">
      <Home size={20} color={Brand.white} strokeWidth={2.4} />
    </Pressable>
  );
}

// Module-level stable references (never recreated)
const renderBackButton = () => <BackButton />;
const renderCustomerModeButton = () => <CustomerModeButton />;
const SCREEN_OPTIONS = {
  headerStyle: { backgroundColor: Brand.red },
  headerTintColor: Brand.white,
  headerTitleStyle: { fontWeight: '700' as const },
  headerLeft: renderBackButton,
  headerRight: renderCustomerModeButton,
};
// Factory outside component avoids S6478 "component inside component" lint
function makeHubLeft(id: string) {
  return function HubLeft() { return <HubBackButton shopId={id} />; };
}

export default function SellerLayout() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { pending, acknowledge, alarm } = useOrderAlarm(shopId);
  // Unresolved (isResolved === false): assume owner/full-access here so we
  // don't flash missing tabs at an actual owner on first render — the far
  // more common case. Only hide once we DEFINITELY know the user isn't the
  // owner (and, for "settings", holds none of HUB_PERMISSIONS either).
  const access = useShopAccess(shopId);
  const hiddenRoutes = useMemo(() => {
    if (!access.isResolved || access.isOwner) return [];
    const hidden = [...OWNER_ONLY_ROUTES];
    if (!HUB_PERMISSIONS.some((p) => access.permissions.includes(p))) hidden.push('settings');
    return hidden;
  }, [access.isResolved, access.isOwner, access.permissions]);

  const handleOpen = useCallback(() => {
    if (!pending) return;
    if (alarm.mode === 'short') acknowledge();
    router.navigate(`/seller/order/${pending.orderId}`);
  }, [pending, alarm.mode, acknowledge]);

  // Stable: SellerTabBar must be rendered as JSX (not called directly) to keep hooks alive
  const tabBar = useCallback(
    (props: React.ComponentProps<typeof SellerTabBar>) => (
      <SellerTabBar {...props} hiddenRoutes={hiddenRoutes} />
    ),
    [hiddenRoutes],
  );

  // Only recreated when shopId changes (useLocalSearchParams won't fire on tab switch)
  const hubLeft = useMemo(() => makeHubLeft(shopId), [shopId]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={tabBar}
        screenOptions={SCREEN_OPTIONS}>
        <Tabs.Screen name="orders" options={{ title: 'Buyurtmalar' }} />
        <Tabs.Screen name="inventory" options={{ title: 'Sklad' }} />
        <Tabs.Screen name="excel" options={{ title: 'Excel import/eksport' }} />
        <Tabs.Screen name="debt" options={{ title: 'Qarz daftar' }} />
        <Tabs.Screen name="staff" options={{ title: 'Xodimlar' }} />
        <Tabs.Screen name="settings" options={{ title: 'Sozlamalar' }} />
        <Tabs.Screen name="shop-settings" options={{ title: "Do'kon sozlamalari", headerLeft: hubLeft }} />
        <Tabs.Screen name="stats" options={{ title: 'Hisobot', headerLeft: hubLeft }} />
        <Tabs.Screen name="blocked" options={{ title: 'Bloklangan foydalanuvchilar', headerLeft: hubLeft }} />
        <Tabs.Screen name="reviews" options={{ title: 'Sharhlar', headerLeft: hubLeft }} />
        <Tabs.Screen name="balance" options={{ title: 'Balans', headerLeft: hubLeft }} />
        <Tabs.Screen name="prime" options={{ title: 'Prime obuna', headerLeft: hubLeft }} />
        <Tabs.Screen name="promotions" options={{ title: 'Aksiyalar', headerLeft: hubLeft }} />
        <Tabs.Screen name="catalog" options={{ title: 'Global katalog', headerLeft: hubLeft }} />
        <Tabs.Screen name="chat-templates" options={{ title: 'Chat shablonlari', headerLeft: hubLeft }} />
        <Tabs.Screen name="delivery-zones" options={{ headerShown: false, tabBarButton: () => null }} />
      </Tabs>

      {pending && (
        <NewOrderBanner
          order={pending}
          mode={alarm.mode}
          onAck={acknowledge}
          onOpen={handleOpen}
        />
      )}
    </View>
  );
}

function NewOrderBanner({
  order,
  mode,
  onAck,
  onOpen,
}: Readonly<{
  order: PendingOrder;
  mode: AlarmMode;
  onAck: () => void;
  onOpen: () => void;
}>) {
  return (
    <SafeAreaView edges={['top']} style={styles.bannerWrap} pointerEvents="box-none">
      <Pressable style={styles.banner} onPress={onOpen}>
        <View style={styles.bellWrap}>
          <Bell size={22} color={Brand.white} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Yangi buyurtma!</Text>
          <Text style={styles.bannerSub}>
            #{order.orderNumber} —{' '}
            {mode === "long" ? "buyurtmani ochish uchun bosing" : "ko’rish uchun bosing"}
          </Text>
        </View>
        {/* In "long" mode there is no dismiss button — the alarm stops only when
            the seller actually opens the order detail. */}
        {mode === 'short' && (
          <Pressable style={styles.ackBtn} onPress={onAck} hitSlop={8}>
            <Text style={styles.ackText}>Ko&apos;rdim</Text>
          </Pressable>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    marginLeft: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerBtn: {
    marginRight: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bannerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    margin: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    backgroundColor: Brand.red,
    borderRadius: Radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 10,
  },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { color: Brand.white, fontSize: 16, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 1 },
  ackBtn: { backgroundColor: Brand.white, paddingHorizontal: Spacing.four, paddingVertical: 8, borderRadius: Radius.full },
  ackText: { color: Brand.red, fontWeight: '800', fontSize: 14 },
});
