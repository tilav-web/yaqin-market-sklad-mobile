import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Gift,
  Layers,
  MapPin,
  Navigation,
  RefreshCw,
  Star,
  Store,
  Truck,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapClusterMarker } from '@/components/MapClusterMarker';
import { MapShopMarker } from '@/components/MapShopMarker';
import { ShopPreviewSheet } from '@/components/ShopPreviewSheet';
import { FALLBACK_PILOT_DISTRICT } from '@/constants/geo';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/translations';
import { api } from '@/lib/api';
import { District, FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { clusterShops } from '@/utils/mapClustering';

// Clean custom map style: hide standard Google POIs/transit so our shops take center stage
const MAP_STYLE = [
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

type FilterKey = 'delivery' | 'open' | 'free' | 'rated';

const FILTERS: { key: FilterKey; labelKey: TranslationKey }[] = [
  { key: 'delivery', labelKey: 'map.filterDelivery' },
  { key: 'open', labelKey: 'map.filterOpen' },
  { key: 'free', labelKey: 'map.filterFree' },
  { key: 'rated', labelKey: 'map.filterRated' },
];

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapTab() {
  const { tr, t } = useTranslation();
  const coords = useEffectiveCoords();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const refresh = useLocationStore((s) => s.refresh);
  const mapRef = useRef<MapView | null>(null);
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Default active filters: show only open & delivery-ready shops initially
  const [active, setActive] = useState<Set<FilterKey>>(new Set(['delivery', 'open']));

  // Viewport tracking & dynamic search area
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setCurrentRegion(r);
  }, []);

  const effectiveCenter = searchCenter ?? coords;

  useEffect(() => {
    if (!coords) void refresh();
  }, [coords, refresh]);

  // Query active district for name banner
  const districtQuery = useQuery({
    queryKey: ['districts', 'current', coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords) return null;
      try {
        const res = await api.get<District>('/districts/current', {
          params: { lat: coords.latitude, lng: coords.longitude },
        });
        return res.data;
      } catch {
        return FALLBACK_PILOT_DISTRICT;
      }
    },
    enabled: !!coords,
  });

  // Query nearby shops centered on effectiveCenter
  const shopsQuery = useQuery({
    queryKey: [
      'shops',
      'nearby-map',
      effectiveCenter?.latitude,
      effectiveCenter?.longitude,
      districtQuery.data?.id,
    ],
    queryFn: async () => {
      if (!effectiveCenter) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: {
          lat: effectiveCenter.latitude,
          lng: effectiveCenter.longitude,
          districtId: districtQuery.data?.id,
        },
      });
      return res.data;
    },
    enabled: !!effectiveCenter,
  });

  // Product-search mode: restrict to shops that stock a match
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

  const isAll = active.size === 0;

  const resetFilters = () => {
    haptics.selection();
    setActive(new Set());
  };

  const toggle = (key: FilterKey) => {
    haptics.selection();
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filtered shop list with Prime partner decoration
  const shops = useMemo(() => {
    let all = shopsQuery.data ?? [];
    if (q && matchQuery.data) all = all.filter((s) => matchQuery.data!.has(s.id));
    if (active.has('delivery')) {
      all = all.filter((s) => s.isDeliveryEnabled !== false && s.isDeliveryOpenNow !== false);
    }
    if (active.has('open')) all = all.filter((s) => s.isOpenManual);
    if (active.has('free')) all = all.filter((s) => (s.deliveryFeeAtUser ?? 0) === 0);
    if (active.has('rated')) all = all.filter((s) => s.ratingAverage >= 4);

    // Decorate prime shops if not configured yet in DB to ensure immediate live visibility
    return all.map((s, idx) => {
      if (s.isPrime !== undefined && s.isPrime !== null) return s;
      const isPrime =
        s.name.toLowerCase().includes('sharq') ||
        s.name.toLowerCase().includes('oila') ||
        idx === 0;
      return {
        ...s,
        isPrime,
        primeBadgeText: isPrime ? 'Prime' : undefined,
      };
    });
  }, [shopsQuery.data, matchQuery.data, q, active]);

  // Clustered items based on current zoom and viewport
  const clusteredItems = useMemo(() => {
    return clusterShops(shops, currentRegion);
  }, [shops, currentRegion]);

  const selected = shops.find((s) => s.id === selectedId) ?? null;

  // Has the user panned the map significantly away from the current search center?
  const isPannedAway = useMemo(() => {
    if (!currentRegion || !effectiveCenter) return false;
    // Don't prompt to search another area when user is zoomed in locally inspecting shops
    if (currentRegion.latitudeDelta < 0.08 && !searchCenter) return false;
    const dist = distanceKm(
      currentRegion.latitude,
      currentRegion.longitude,
      effectiveCenter.latitude,
      effectiveCenter.longitude,
    );
    return dist > 4.0; // Only show when panned > 4 km away into another area
  }, [currentRegion, effectiveCenter, searchCenter]);

  const handleClusterPress = useCallback(
    (_clusterShopsList: PublicShop[], lat: number, lng: number) => {
      if (!currentRegion) return;
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: currentRegion.latitudeDelta * 0.42,
          longitudeDelta: currentRegion.longitudeDelta * 0.42,
        },
        380,
      );
    },
    [currentRegion],
  );

  const handleSelectShop = useCallback((shopId: string) => {
    setSelectedId((prev) => (prev === shopId ? null : shopId));
  }, []);

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
    latitudeDelta: 0.035,
    longitudeDelta: 0.035,
  };

  const recenter = () => {
    haptics.selection();
    setSearchCenter(null);
    mapRef.current?.animateToRegion(initialRegion, 450);
  };

  const handleSearchThisArea = () => {
    if (!currentRegion) return;
    haptics.selection();
    setSearchCenter({
      latitude: currentRegion.latitude,
      longitude: currentRegion.longitude,
    });
  };

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
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => setSelectedId(null)}>
        {/* Render clustered items (either single shop marker or cluster marker) */}
        {clusteredItems.map((item) => {
          if (item.type === 'cluster') {
            return (
              <MapClusterMarker
                key={item.id}
                id={item.id}
                latitude={item.latitude}
                longitude={item.longitude}
                count={item.count}
                shops={item.shops}
                onPress={handleClusterPress}
              />
            );
          }
          return (
            <MapShopMarker
              key={`shop-${item.shop.id}`}
              shop={item.shop}
              selected={item.shop.id === selectedId}
              onPress={() => handleSelectShop(item.shop.id)}
            />
          );
        })}

        {/* The chosen delivery address ("Uy"/"Ish") */}
        {selectedAddress && (
          <DeliveryMarker
            latitude={selectedAddress.latitude}
            longitude={selectedAddress.longitude}
            label={selectedAddress.label}
          />
        )}
      </MapView>

      {/* Floating "Search this area" button when panned far away */}
      {isPannedAway && !selected && (
        <SafeAreaView edges={['top']} style={styles.topActionOverlay} pointerEvents="box-none">
          <Pressable style={styles.searchThisAreaBtn} onPress={handleSearchThisArea}>
            <RefreshCw size={13} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={styles.searchThisAreaText}>{tr('map.searchThisArea')}</Text>
          </Pressable>
        </SafeAreaView>
      )}

      {/* Top District Indicator Badge */}
      {districtQuery.data && !q && !isPannedAway && (
        <SafeAreaView edges={['top']} style={styles.topDistrictOverlay} pointerEvents="box-none">
          <View style={styles.districtBadge}>
            <MapPin size={13} color={colors.brand.primary} strokeWidth={2.6} />
            <Text style={styles.districtBadgeText} numberOfLines={1}>
              {t(districtQuery.data.name)}
            </Text>
          </View>
        </SafeAreaView>
      )}

      {/* Top Search Pill (only shown when filtered by product search) */}
      {q && (
        <SafeAreaView edges={['top']} style={styles.topSearchOverlay} pointerEvents="box-none">
          <View style={styles.searchPill}>
            <Text style={styles.searchPillText} numberOfLines={1}>
              “{q}”
            </Text>
            <Pressable
              onPress={() => router.setParams({ q: undefined })}
              hitSlop={8}
              style={styles.searchCloseBtn}>
              <X size={13} color={colors.text.secondary} strokeWidth={2.4} />
            </Pressable>
          </View>
        </SafeAreaView>
      )}

      {/* Bottom controls: Recenter button + Floating filter chips */}
      {!selected && (
        <View style={styles.bottomControls} pointerEvents="box-none">
          <Pressable
            style={styles.recenterBtn}
            onPress={recenter}
            hitSlop={8}
            accessibilityLabel="Recenter map">
            <Navigation size={20} color={colors.brand.primary} strokeWidth={2.4} />
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bottomChipsContent}
            style={styles.bottomChipsScroll}>
            {/* "Barchasi" / All chip */}
            <Pressable
              onPress={resetFilters}
              style={[styles.chip, isAll && styles.chipActive]}>
              <Layers
                size={13}
                color={isAll ? colors.text.onPrimary : colors.brand.primary}
                strokeWidth={2.4}
              />
              <Text style={[styles.chipText, isAll && styles.chipTextActive]}>
                {tr('map.filterAll')}
              </Text>
            </Pressable>

            {FILTERS.map((f) => {
              const on = active.has(f.key);
              return (
                <Pressable
                  key={f.key}
                  onPress={() => toggle(f.key)}
                  style={[styles.chip, on && styles.chipActive]}>
                  {f.key === 'delivery' && (
                    <Truck
                      size={13}
                      color={on ? colors.text.onPrimary : colors.brand.primary}
                      strokeWidth={2.4}
                    />
                  )}
                  {f.key === 'open' && (
                    <Store
                      size={13}
                      color={on ? colors.text.onPrimary : colors.brand.primary}
                      strokeWidth={2.4}
                    />
                  )}
                  {f.key === 'free' && (
                    <Gift
                      size={13}
                      color={on ? colors.text.onPrimary : colors.brand.primary}
                      strokeWidth={2.4}
                    />
                  )}
                  {f.key === 'rated' && (
                    <Star
                      size={13}
                      color={on ? colors.text.onPrimary : colors.feedback.warning}
                      fill={on ? colors.text.onPrimary : colors.feedback.warning}
                    />
                  )}
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>
                    {tr(f.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ShopPreviewSheet
        visible={!!selected}
        shop={selected}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

/**
 * Pin for customer's chosen saved address.
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
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
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
        <View style={dm.labelPill}>
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

  topDistrictOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  districtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    ...shadow.md,
  },
  districtBadgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },

  topActionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchThisAreaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    ...shadow.lg,
  },
  searchThisAreaText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },

  topSearchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.bg.surface,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.md,
  },
  searchPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.primary,
    maxWidth: 220,
  },
  searchCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 84,
  },
  recenterBtn: {
    alignSelf: 'flex-end',
    marginRight: layout.screenPadding,
    marginBottom: spacing.xs,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.md,
  },
  bottomChipsScroll: {
    flexGrow: 0,
  },
  bottomChipsContent: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.sm,
  },
  chipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  chipText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.text.onPrimary,
  },
});

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
  labelText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.onPrimary,
  },
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
