import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';

export default function HomeScreen() {
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refresh = useLocationStore((s) => s.refresh);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const coords = useEffectiveCoords();

  useEffect(() => {
    if (!permissionStatus) {
      void requestPermission().then(() => refresh());
    } else if (permissionStatus === 'granted' && !coords) {
      void refresh();
    }
  }, [permissionStatus, coords, requestPermission, refresh]);

  const shopsQuery = useQuery({
    queryKey: ['shops', 'nearby', coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: { lat: coords.latitude, lng: coords.longitude },
      });
      return res.data;
    },
    enabled: !!coords,
  });

  if (!coords) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Brand.blue} />
        <Text style={styles.dim}>Lokatsiya so&apos;ralmoqda…</Text>
        <Pressable style={styles.btn} onPress={() => void refresh()}>
          <Text style={styles.btnText}>Qayta urinish</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={shopsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={shopsQuery.isFetching}
            onRefresh={() => {
              void refresh();
              void shopsQuery.refetch();
            }}
            tintColor={Brand.blue}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.headerTitle}>Yaqin do&apos;konlar</Text>
            <Text style={styles.headerSub}>
              {shopsQuery.data?.length ?? 0} ta do&apos;kon yetkazib bera oladi
            </Text>
          </View>
        }
        ListEmptyComponent={
          shopsQuery.isLoading ? (
            <ActivityIndicator color={Brand.blue} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📍</Text>
              <Text style={styles.emptyTitle}>Yaqin atrofda do&apos;kon yo&apos;q</Text>
              <Text style={styles.dim}>
                Sotuvchilar ariza qoldirishidan keyin bu yerda paydo bo&apos;ladi
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <ShopCard shop={item} />}
      />
    </SafeAreaView>
  );
}

function ShopCard({ shop }: { shop: PublicShop }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push(`/shop/${shop.id}`)}>
      <View style={styles.cardImageWrap}>
        {shop.photos[0] ? (
          <Image source={{ uri: shop.photos[0] }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={styles.cardImageEmoji}>🏪</Text>
          </View>
        )}
        {!shop.isOpenManual && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Yopiq</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {shop.name}
        </Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.dim}>{shop.distanceKm?.toFixed(2)} km</Text>
          <View style={styles.dot} />
          <Text style={styles.dim}>
            {shop.deliveryFeeAtUser === 0
              ? 'Tekin yetkazish'
              : `Yetkazish ${shop.deliveryFeeAtUser?.toLocaleString()} so'm`}
          </Text>
        </View>
        {shop.minOrderPrice > 0 && (
          <Text style={styles.minOrder}>
            Min. {shop.minOrderPrice.toLocaleString()} so&apos;m
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  list: { paddingBottom: Spacing.six },
  headerBlock: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.three },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Brand.blue },
  headerSub: { fontSize: 14, color: Brand.gray600, marginTop: 2 },
  card: {
    backgroundColor: Brand.white,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.gray100,
  },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', height: 160, backgroundColor: Brand.gray100 },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardImageEmoji: { fontSize: 56 },
  closedBadge: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    backgroundColor: Brand.red,
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  closedText: { color: Brand.white, fontSize: 12, fontWeight: '700' },
  cardBody: { padding: Spacing.four, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Brand.black },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Brand.gray400 },
  dim: { fontSize: 13, color: Brand.gray600 },
  minOrder: { fontSize: 13, color: Brand.red, marginTop: 2, fontWeight: '600' },
  emptyState: { padding: Spacing.six, alignItems: 'center', gap: Spacing.three },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Brand.black, textAlign: 'center' },
  btn: { backgroundColor: Brand.blue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.lg },
  btnText: { color: Brand.white, fontWeight: '700' },
});
