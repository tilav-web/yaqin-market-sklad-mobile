import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Navigation, Store, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

export default function MapTab() {
  const coords = useEffectiveCoords();
  const refresh = useLocationStore((s) => s.refresh);
  const mapRef = useRef<MapView | null>(null);
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) void refresh();
  }, [coords, refresh]);

  const shopsQuery = useQuery({
    queryKey: ['shops', 'nearby-map', coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: { lat: coords.latitude, lng: coords.longitude },
      });
      return res.data;
    },
    enabled: !!coords,
  });

  // When arriving from product search ("show on map"), restrict pins to shops
  // that actually stock a matching product.
  const matchQuery = useQuery({
    queryKey: ['map-product-shops', coords?.latitude, coords?.longitude, q],
    queryFn: async () => {
      if (!coords || !q) return null;
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: { lat: coords.latitude, lng: coords.longitude, q, limit: 60 },
      });
      return new Set(res.data.items.map((i) => i.shopId));
    },
    enabled: !!coords && !!q,
  });

  const shops = useMemo(() => {
    const all = shopsQuery.data ?? [];
    if (q && matchQuery.data) return all.filter((s) => matchQuery.data!.has(s.id));
    return all;
  }, [shopsQuery.data, matchQuery.data, q]);

  const selected = shops.find((s) => s.id === selectedId) ?? null;

  if (!coords) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
        <Text style={styles.dim}>Lokatsiya kutilmoqda…</Text>
      </SafeAreaView>
    );
  }

  const initialRegion: Region = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  const recenter = () => {
    mapRef.current?.animateToRegion(initialRegion, 400);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedId(null)}>
        {shops.map((shop) => (
          <Marker
            key={shop.id}
            coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
            pinColor={shop.id === selectedId ? colors.brand.primaryDark : colors.brand.primary}
            onPress={() => setSelectedId(shop.id)}
          />
        ))}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.topBannerWrap} pointerEvents="box-none">
        <View style={styles.topBanner}>
          <Text style={styles.bannerTitle}>
            {q ? `“${q}” — ${shops.length} ta do‘konda` : `${shops.length} ta do‘kon yaqinda`}
          </Text>
          <Text style={styles.bannerSub}>Pinni bosing → do‘kon ma’lumoti</Text>
        </View>
      </SafeAreaView>

      <Pressable style={styles.recenterBtn} onPress={recenter}>
        <Navigation size={20} color={colors.brand.primary} strokeWidth={2.4} />
      </Pressable>

      {selected && (
        <SafeAreaView edges={['bottom']} style={styles.cardWrap} pointerEvents="box-none">
          <View style={styles.card}>
            <Pressable style={styles.cardClose} onPress={() => setSelectedId(null)} hitSlop={8}>
              <X size={18} color={colors.text.tertiary} />
            </Pressable>
            <Pressable style={styles.cardBody} onPress={() => router.push(`/shop/${selected.id}`)}>
              <View style={styles.cardIcon}>
                <Store size={22} color={colors.brand.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {selected.distanceKm?.toFixed(1)} km ·{' '}
                  {selected.deliveryFeeAtUser === 0
                    ? 'Tekin yetkazish'
                    : `${selected.deliveryFeeAtUser?.toLocaleString()} so‘m`}
                </Text>
                <View style={styles.cardBadges}>
                  <Text style={[styles.badge, selected.isOpenManual ? styles.badgeOpen : styles.badgeClosed]}>
                    {selected.isOpenManual ? 'Ochiq' : 'Yopiq'}
                  </Text>
                  {selected.ratingCount > 0 && (
                    <Text style={styles.ratingBadge}>★ {selected.ratingAverage.toFixed(1)}</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={22} color={colors.text.hint} />
            </Pressable>
            <Pressable style={styles.enterBtn} onPress={() => router.push(`/shop/${selected.id}`)}>
              <Text style={styles.enterBtnText}>Do‘konga kirish</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.surfaceMuted },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.canvas,
  },
  dim: { ...typography.bodySmall, color: colors.text.secondary },
  topBannerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBanner: {
    margin: layout.screenPadding,
    backgroundColor: colors.bg.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadow.md,
  },
  bannerTitle: { ...typography.bodyStrong, color: colors.brand.primary },
  bannerSub: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  recenterBtn: {
    position: 'absolute',
    right: layout.screenPadding,
    bottom: 140,
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  cardWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  card: {
    margin: layout.screenPadding,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.lg,
  },
  cardClose: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 1, padding: 2 },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { ...typography.h4 },
  cardMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  cardBadges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  badge: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeOpen: { color: colors.feedback.success, backgroundColor: colors.feedback.successSurface },
  badgeClosed: { color: colors.text.tertiary, backgroundColor: colors.bg.surfaceMuted },
  ratingBadge: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.feedback.warning,
    backgroundColor: colors.feedback.warningSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  enterBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterBtnText: { ...typography.button, color: colors.text.onPrimary },
});
