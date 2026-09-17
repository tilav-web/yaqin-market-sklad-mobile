import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Gift, MapPin, Navigation, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapClusterMarker } from '@/components/MapClusterMarker';
import { MapShopCarousel } from '@/components/MapShopCarousel';
import { MapShopMarker } from '@/components/MapShopMarker';
import { ShopPreviewSheet } from '@/components/ShopPreviewSheet';
import { FALLBACK_PILOT_DISTRICT } from '@/constants/geo';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { District, FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { createShopClusterIndex, getClustersForRegion } from '@/utils/mapClustering';

// Clean custom map style: hide standard Google POIs/transit so our delivery shops take center stage
const MAP_STYLE = [
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function MapTab() {
  const insets = useSafeAreaInsets();
  const { tr, t } = useTranslation();
  const coords = useEffectiveCoords();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const refresh = useLocationStore((s) => s.refresh);
  const mapRef = useRef<MapView | null>(null);
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewShop, setPreviewShop] = useState<PublicShop | null>(null);
  const [onlyFreeDelivery, setOnlyFreeDelivery] = useState(false);

  // Viewport tracking for smooth LOD clustering
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [debouncedRegion, setDebouncedRegion] = useState<Region | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bottomInset = Math.max(insets.bottom, 12);
  const recenterBottom = bottomInset + 72 + 104;

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setCurrentRegion(r);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedRegion(r);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!coords) void refresh();
  }, [coords, refresh]);

  // Query active district
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
    staleTime: 10 * 60 * 1000,
  });

  // Single fast query for all delivery-capable shops around customer's active location
  const shopsQuery = useQuery({
    queryKey: [
      'shops',
      'delivery-ready',
      coords?.latitude,
      coords?.longitude,
      districtQuery.data?.id,
    ],
    queryFn: async () => {
      if (!coords) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: {
          lat: coords.latitude,
          lng: coords.longitude,
          districtId: districtQuery.data?.id,
        },
      });
      return res.data;
    },
    enabled: !!coords,
    staleTime: 5 * 60 * 1000,
  });

  // Product-search mode: restrict to shops that stock a search match
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
    staleTime: 5 * 60 * 1000,
  });

  // Filtered and sorted shops list
  const shops = useMemo(() => {
    let all = shopsQuery.data ?? [];
    if (q && matchQuery.data) {
      all = all.filter((s) => matchQuery.data!.has(s.id));
    }
    if (onlyFreeDelivery) {
      all = all.filter(
        (s) =>
          (s.deliveryFeeAtUser ?? 0) === 0 &&
          s.isDeliveryEnabled !== false &&
          s.isOpenManual,
      );
    }

    // Decorate prime partners
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
  }, [shopsQuery.data, matchQuery.data, q, onlyFreeDelivery]);

  // Supercluster K-D tree spatial index over delivery-capable shops
  const clusterIndex = useMemo(() => {
    return createShopClusterIndex(shops);
  }, [shops]);

  // Clustered items based on current zoom and viewport
  const clusteredItems = useMemo(() => {
    return getClustersForRegion(clusterIndex, debouncedRegion ?? currentRegion, shops);
  }, [clusterIndex, debouncedRegion, currentRegion, shops]);

  const initialRegion = useMemo<Region>(() => {
    return {
      latitude: coords?.latitude ?? 41.2995,
      longitude: coords?.longitude ?? 69.2401,
      latitudeDelta: 0.035,
      longitudeDelta: 0.035,
    };
  }, [coords?.latitude, coords?.longitude]);

  const handleClusterPress = useCallback(
    (_clusterShopsList: PublicShop[], lat: number, lng: number, expansionZoom?: number) => {
      const r = currentRegion ?? initialRegion;
      const targetDelta = expansionZoom
        ? Math.min(r.latitudeDelta * 0.5, 360 / Math.pow(2, expansionZoom))
        : Math.max(0.008, r.latitudeDelta * 0.42);

      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: Math.max(0.005, targetDelta),
          longitudeDelta: Math.max(0.005, targetDelta),
        },
        350,
      );
    },
    [currentRegion, initialRegion],
  );

  const handleSelectShop = useCallback(
    (shopId: string) => {
      setSelectedId(shopId);
      const found = shops.find((s) => s.id === shopId);
      if (found && Number.isFinite(found.latitude) && Number.isFinite(found.longitude)) {
        mapRef.current?.animateToRegion(
          {
            latitude: found.latitude - 0.0035, // offset so marker stays above bottom carousel
            longitude: found.longitude,
            latitudeDelta: 0.016,
            longitudeDelta: 0.016,
          },
          350,
        );
      }
    },
    [shops],
  );

  const recenter = useCallback(() => {
    haptics.selection();
    mapRef.current?.animateToRegion(initialRegion, 450);
  }, [initialRegion]);

  if (!coords) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
        <Text style={styles.dim}>{tr('map.waiting')}</Text>
      </SafeAreaView>
    );
  }

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
        mapPadding={{
          top: insets.top + 60,
          right: 0,
          bottom: bottomInset + 170,
          left: 0,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => setSelectedId(null)}>
        {/* Render clustered items (single shop marker or cluster marker) */}
        {clusteredItems.map((item) => {
          if (item.type === 'cluster') {
            return (
              <MapClusterMarker
                key={item.id}
                id={item.id}
                latitude={item.latitude}
                longitude={item.longitude}
                count={item.count}
                expansionZoom={item.expansionZoom}
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

      {/* Top Floating Bar: District Badge + Minimalist Free Delivery Toggle */}
      <SafeAreaView edges={['top']} style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.topBar}>
          {/* District Name Badge */}
          {districtQuery.data && !q && (
            <View style={styles.districtBadge}>
              <MapPin size={13} color={colors.brand.primary} strokeWidth={2.6} />
              <Text style={styles.districtBadgeText} numberOfLines={1}>
                {t(districtQuery.data.name)}
              </Text>
            </View>
          )}

          {/* Product Search Pill */}
          {q && (
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
          )}

          {/* Minimal Free Delivery Toggle Switch */}
          <Pressable
            style={[
              styles.freeToggleBtn,
              onlyFreeDelivery && styles.freeToggleBtnActive,
            ]}
            onPress={() => {
              haptics.selection();
              setOnlyFreeDelivery((prev) => !prev);
            }}>
            <Gift
              size={13}
              color={onlyFreeDelivery ? '#FFFFFF' : colors.brand.primary}
              strokeWidth={2.4}
            />
            <Text
              style={[
                styles.freeToggleText,
                onlyFreeDelivery && styles.freeToggleTextActive,
              ]}>
              {tr('shop.freeShort')} {tr('map.filterDelivery')}
            </Text>
            <View
              style={[
                styles.switchThumb,
                onlyFreeDelivery && styles.switchThumbActive,
              ]}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Recenter button (floats directly above the bottom carousel) */}
      <View
        style={[styles.recenterWrap, { bottom: recenterBottom }]}
        pointerEvents="box-none">
        <Pressable
          style={styles.recenterBtn}
          onPress={recenter}
          hitSlop={8}
          accessibilityLabel="Recenter map">
          <Navigation size={20} color={colors.brand.primary} strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Bottom Horizontal Shop Carousel (Airbnb style) */}
      <MapShopCarousel
        shops={shops}
        selectedId={selectedId}
        onSelectShop={handleSelectShop}
        onOpenPreview={(shop) => setPreviewShop(shop)}
      />

      {/* Quick In-Map Product Catalog / Checkout Sheet */}
      <ShopPreviewSheet
        visible={!!previewShop}
        shop={previewShop}
        onClose={() => setPreviewShop(null)}
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

  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenPadding,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  districtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    flexShrink: 1,
    ...shadow.md,
  },
  districtBadgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },

  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.md,
  },
  searchPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.primary,
    maxWidth: 160,
  },
  searchCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Minimal Free Delivery Toggle Pill with Switch Indicator
  freeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingLeft: spacing.md,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    ...shadow.md,
  },
  freeToggleBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  freeToggleText: {
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  freeToggleTextActive: {
    color: '#FFFFFF',
  },
  switchThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
  },
  switchThumbActive: {
    backgroundColor: '#10B981',
  },

  recenterWrap: {
    position: 'absolute',
    right: layout.screenPadding,
  },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.lg,
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
