import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Gift, Navigation, Star } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShopPreviewSheet } from '@/components/ShopPreviewSheet';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/translations';
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

const FILTERS: { key: FilterKey; labelKey: TranslationKey }[] = [
  { key: 'open', labelKey: 'map.filterOpen' },
  { key: 'free', labelKey: 'map.filterFree' },
  { key: 'rated', labelKey: 'map.filterRated' },
];

export default function MapTab() {
  const { tr } = useTranslation();
  const coords = useEffectiveCoords();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
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
        <Text style={styles.dim}>{tr('map.waiting')}</Text>
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
        toolbarEnabled={false}>
        {shops.map((shop) => (
          <ShopMarker
            key={shop.id}
            shop={shop}
            selected={shop.id === selectedId}
            onPress={() => setSelectedId(shop.id)}
          />
        ))}
        {/* The chosen delivery address ("Uy"/"Ish"). GPS already has the blue
            dot, so we only pin a manually picked address. */}
        {selectedAddress && (
          <DeliveryMarker
            latitude={selectedAddress.latitude}
            longitude={selectedAddress.longitude}
            label={selectedAddress.label}
          />
        )}
      </MapView>

      {/* Top overlay: count banner + filter chips */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            {q
              ? tr('map.shopsQuery', { q, n: shops.length })
              : tr('map.shopsN', { n: shops.length })}
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
                <Text style={[styles.chipText, on && styles.chipTextActive]}>{tr(f.labelKey)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <Pressable style={styles.recenterBtn} onPress={recenter}>
        <Navigation size={20} color={colors.brand.primary} strokeWidth={2.4} />
      </Pressable>

      <ShopPreviewSheet
        visible={!!selected}
        shop={selected}
        onClose={() => setSelectedId(null)}
      />
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

  const closed = !shop.isOpenManual;

  return (
    <Marker
      coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
      onPress={onPress}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}>
      <View style={[mk.wrap, closed && mk.wrapClosed]}>
        <View style={[mk.pill, selected && mk.pillActive, closed && mk.pillClosed]}>
          <View style={[mk.avatar, selected && mk.avatarActive, closed && mk.avatarClosed]}>
            <Text style={[mk.avatarLetter, selected && mk.avatarLetterActive]}>
              {shop.name[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={mk.textCol}>
            <Text style={[mk.name, selected && mk.textActive, closed && mk.textClosed]} numberOfLines={1}>
              {shop.name}
            </Text>
            {closed ? (
              <Text style={mk.closedTag}>Yopiq</Text>
            ) : (
              shop.distanceKm !== undefined && (
                <Text style={[mk.dist, selected && mk.textActive]}>
                  {shop.distanceKm.toFixed(1)} km
                </Text>
              )
            )}
          </View>
        </View>
        <View style={[mk.tail, selected && mk.tailActive, closed && mk.tailClosed]} />
      </View>
    </Marker>
  );
}

/**
 * Pin for the customer's chosen delivery location (a saved address). A teal
 * "home" badge with the address label, visually distinct from the red shop
 * pills so the user can see where their orders will be delivered.
 */
function DeliveryMarker({
  latitude,
  longitude,
  label,
}: {
  readonly latitude: number;
  readonly longitude: number;
  readonly label: string;
}) {
  const text = label.length > 10 ? label.slice(0, 10) : label;

  // Re-track for a short while AFTER the text has measured, then stop. Keyed on
  // `text` so an auto-width pill never snapshots a half-laid-out (clipped) label.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 1200);
    return () => clearTimeout(id);
  }, [text]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={999}>
      <View style={dm.wrap}>
        <View style={dm.labelPill} onLayout={() => setTracks(true)}>
          <Text style={dm.labelText} allowFontScaling={false}>
            {text}
          </Text>
        </View>
        <View style={dm.tail} />
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
  // Closed: muted gray, faded and dashed — visibly "disabled".
  wrapClosed: { opacity: 0.6 },
  pillClosed: {
    backgroundColor: colors.bg.surfaceMuted,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: { backgroundColor: colors.text.onPrimary },
  avatarClosed: { backgroundColor: colors.text.hint },
  avatarLetter: { color: colors.text.onPrimary, fontSize: 13, fontWeight: '800' },
  avatarLetterActive: { color: colors.brand.primary },
  textCol: { flexShrink: 1 },
  name: { ...typography.caption, fontSize: 12, fontWeight: '800', color: colors.text.primary },
  dist: { ...typography.caption, fontSize: 10, color: colors.text.secondary, marginTop: -1 },
  textActive: { color: colors.text.onPrimary },
  textClosed: { color: colors.text.tertiary },
  closedTag: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
    marginTop: -1,
  },
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
  tailClosed: { borderTopColor: colors.bg.surfaceMuted },
});

// Delivery-location pin — a distinct slate-blue so it never reads as a shop.
const DELIVERY = colors.feedback.info;
const dm = StyleSheet.create({
  wrap: { alignItems: 'center' },
  labelPill: {
    backgroundColor: DELIVERY,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.bg.surface,
    ...shadow.md,
  },
  labelText: { ...typography.caption, fontSize: 13, fontWeight: '800', color: colors.text.onPrimary },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: DELIVERY,
    marginTop: -1,
  },
});
