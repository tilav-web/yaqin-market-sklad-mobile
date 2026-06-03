import { Tabs, router, useGlobalSearchParams } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SellerTabBar } from '@/components/SellerTabBar';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { PendingOrder, useOrderAlarm } from '@/lib/useOrderAlarm';

function BackButton() {
  // Pop back to the (already-mounted) customer tabs instead of replacing them —
  // `replace` re-mounts the whole tab tree (home feed, map…) and causes a
  // ~1.5s freeze; `back` returns instantly and preserves their state.
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

/** Back to the shop hub (Sozlamalar tab) for sub-screens opened from it. */
function HubBackButton({ shopId }: { shopId: string }) {
  return (
    <Pressable style={styles.backBtn} onPress={() => router.navigate(`/seller/${shopId}/settings`)} hitSlop={10}>
      <ArrowLeft size={22} color={Brand.white} strokeWidth={2.6} />
    </Pressable>
  );
}

export default function SellerLayout() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { pending, acknowledge } = useOrderAlarm(shopId);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <SellerTabBar {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: Brand.red },
          headerTintColor: Brand.white,
          headerTitleStyle: { fontWeight: '700' },
          headerLeft: () => <BackButton />,
        }}>
        <Tabs.Screen name="orders" options={{ title: 'Buyurtmalar' }} />
        <Tabs.Screen name="inventory" options={{ title: 'Sklad' }} />
        <Tabs.Screen name="debt" options={{ title: 'Qarz daftar' }} />
        <Tabs.Screen name="staff" options={{ title: 'Xodimlar' }} />
        <Tabs.Screen name="settings" options={{ title: 'Sozlamalar' }} />
        {/* Sub-screens reached from the Sozlamalar hub (hidden from the bar). */}
        <Tabs.Screen
          name="shop-settings"
          options={{ title: 'Do‘kon sozlamalari', headerLeft: () => <HubBackButton shopId={shopId} /> }}
        />
        <Tabs.Screen
          name="stats"
          options={{ title: 'Hisobot', headerLeft: () => <HubBackButton shopId={shopId} /> }}
        />
        <Tabs.Screen
          name="blocked"
          options={{ title: 'Bloklangan foydalanuvchilar', headerLeft: () => <HubBackButton shopId={shopId} /> }}
        />
        <Tabs.Screen
          name="reviews"
          options={{ title: 'Sharhlar', headerLeft: () => <HubBackButton shopId={shopId} /> }}
        />
      </Tabs>

      {pending && (
        <NewOrderBanner
          order={pending}
          onAck={acknowledge}
          onOpen={() => {
            acknowledge();
            router.navigate(`/seller/${shopId}/orders`);
          }}
        />
      )}
    </View>
  );
}

function NewOrderBanner({
  order,
  onAck,
  onOpen,
}: {
  order: PendingOrder;
  onAck: () => void;
  onOpen: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.bannerWrap} pointerEvents="box-none">
      <Pressable style={styles.banner} onPress={onOpen}>
        <View style={styles.bellWrap}>
          <Bell size={22} color={Brand.white} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Yangi buyurtma!</Text>
          <Text style={styles.bannerSub}>#{order.orderNumber} — ko&apos;rish uchun bosing</Text>
        </View>
        <Pressable style={styles.ackBtn} onPress={onAck} hitSlop={8}>
          <Text style={styles.ackText}>Ko&apos;rdim</Text>
        </Pressable>
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
