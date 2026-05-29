import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Gift, Navigation, Star, Store, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

// Hide Google's POIs/transit so only our shops stand out; keep street names.
const MAP_STYLE = [
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

type FilterKey = 'open' | 'free' | 'rated';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'open', label: 'Ochiq' },
  { key: 'free', label: 'Tekin yetkazish' },
  { key: 'rated', label: 'Reyting 4+' },
];

export default function MapTab() {
  const coords = useEffectiveCoords();
  const refresh = useLocationStore((s) => s.refresh);
  const mapRef = useRef<MapView | null>(null);
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<Set<FilterKey>>(new Set());

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

  // Product-search mode (arrived from Search "show on map"): restrict to shops
  // that stock a match.
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

  const toggle = (key: FilterKey) => {
    haptics.selection();
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const shops = useMemo(() => {
    let all = shopsQuery.data ?? [];
    if (q && matchQuery.data) all = all.filter((s) => matchQuery.data!.has(s.id));
    if (active.has('open')) all = all.filter((s) => s.isOpenManual);
    if (active.has('free')) all = all.filter((s) => (s.deliveryFeeAtUser ?? 0) === 0);
    if (active.has('rated')) all = all.filter((s) => s.ratingAverage >= 4);
    return all;
  }, [shopsQuery.data, matchQuery.data, q, active]);

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
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };
  const recenter = () => mapRef.current?.animateToRegion(initialRegion, 450);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}>
        {shops.map((shop) => (
          <ShopMarker
            key={shop.id}
            shop={shop}
            selected={shop.id === selectedId}
            onPress={() => setSelectedId(shop.id)}
          />
        ))}
      </MapView>

      {/* Top overlay: count banner + filter chips */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {q ? `“${q}” — ${shops.length} ta do‘konda` : `${shops.length} ta do‘kon`}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f) => {
            const on = active.has(f.key);
            return (
              <Pressable
                key={f.key}
                onPress={() => toggle(f.key)}
                style={[styles.chip, on && styles.chipActive]}>
                {f.key === 'free' && (
                  <Gift size={13} color={on ? colors.text.onPrimary : colors.brand.primary} strokeWidth={2.4} />
                )}
                {f.key === 'rated' && (
                  <Star size={13} color={on ? colors.text.onPrimary : colors.feedback.warning} fill={on ? colors.text.onPrimary : colors.feedback.warning} />
                )}
                <Text style={[styles.chipText, on && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
                <Text style={styles.cardName} numberOfLines={1}>{selected.name}</Text>
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

/**
 * Custom map marker: a white pill showing the shop's initial, name and
 * distance (instead of a bare red pin) with a small pointer tail. Highlights
 * red when selected. Closed shops read muted.
 */
function ShopMarker({
  shop,
  selected,
  onPress,
}: {
  readonly shop: PublicShop;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  // Briefly track view changes so the custom marker renders on Android, then
  // stop for performance.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 700);
    return () => clearTimeout(id);
  }, [selected]);

  if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) return null;

  return (
    <Marker
      coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
      onPress={onPress}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}>
      <View style={mk.wrap}>
        <View style={[mk.pill, selected && mk.pillActive, !shop.isOpenManual && mk.pillClosed]}>
          <View style={[mk.avatar, selected && mk.avatarActive]}>
            <Text style={[mk.avatarLetter, selected && mk.avatarLetterActive]}>
              {shop.name[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={mk.textCol}>
            <Text style={[mk.name, selected && mk.textActive]} numberOfLines={1}>
              {shop.name}
            </Text>
            {shop.distanceKm !== undefined && (
              <Text style={[mk.dist, selected && mk.textActive]}>
                {shop.distanceKm.toFixed(1)} km
              </Text>
            )}
          </View>
        </View>
        <View style={[mk.tail, selected && mk.tailActive, !shop.isOpenManual && mk.tailClosed]} />
      </View>
    </Marker>
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
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  banner: {
    alignSelf: 'flex-start',
    marginHorizontal: layout.screenPadding,
    marginTop: spacing.sm,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    ...shadow.md,
  },
  bannerTitle: { ...typography.bodyStrong, fontSize: 13, color: colors.brand.primary },
  chipsRow: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    ...shadow.sm,
  },
  chipActive: { backgroundColor: colors.brand.primary },
  chipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  chipTextActive: { color: colors.text.onPrimary },
  recenterBtn: {
    position: 'absolute',
    right: layout.screenPadding,
    bottom: 150,
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

const mk = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 170,
    paddingVertical: 4,
    paddingHorizontal: 6,
    paddingRight: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    ...shadow.md,
  },
  pillActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  pillClosed: { opacity: 0.92 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: { backgroundColor: colors.text.onPrimary },
  avatarLetter: { color: colors.text.onPrimary, fontSize: 13, fontWeight: '800' },
  avatarLetterActive: { color: colors.brand.primary },
  textCol: { flexShrink: 1 },
  name: { ...typography.caption, fontSize: 12, fontWeight: '800', color: colors.text.primary },
  dist: { ...typography.caption, fontSize: 10, color: colors.text.secondary, marginTop: -1 },
  textActive: { color: colors.text.onPrimary },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.bg.surface,
    marginTop: -1,
  },
  tailActive: { borderTopColor: colors.brand.primary },
  tailClosed: {},
});
