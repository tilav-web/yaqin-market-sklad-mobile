import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bike, Maximize2, Package } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, MapMarker, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { PILOT_CITY_CENTER } from '@/constants/geo';
import { api } from '@/lib/api';
import { OrderStatus } from '@/lib/types';
import { useMultiOrderSocket } from '@/lib/useMultiOrderSocket';
import { colors, radius, shadow, spacing, typography } from '@/theme';

interface ActiveDelivery {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  shopId: string;
  shopName: string;
  shopLat: number;
  shopLng: number;
  deliveryAddress: { lat: number; lng: number; address: string } | null;
  courierLocation: { lat: number; lng: number; etaMinutes: number | null; updatedAt: string } | null;
}

// Stable identity for the "not loaded yet" case — a fresh `[]` on every render
// would invalidate the memos below each time.
const NO_DELIVERIES: ActiveDelivery[] = [];

/**
 * Live courier map. Deliberately nothing but the map: the customer opens this
 * to watch where their order is, and every card, badge or list that used to
 * sit under it only covered up the one thing they came for. Order details stay
 * one tap away through a marker callout.
 */
export default function TrackingScreen() {
  const { tr } = useTranslation();
  const mapRef = useRef<MapView | null>(null);

  const deliveriesQuery = useQuery({
    queryKey: ['orders', 'active-deliveries'],
    queryFn: async () => (await api.get<ActiveDelivery[]>('/orders/active-deliveries')).data,
    refetchInterval: 15_000,
  });

  const deliveries = deliveriesQuery.data ?? NO_DELIVERIES;
  const orderIds = useMemo(() => deliveries.map((d) => d.orderId), [deliveries]);
  const liveLocations = useMultiOrderSocket(orderIds);

  // REST snapshot merged with live socket updates — the socket wins once it
  // has spoken for an order, otherwise fall back to the last fetch.
  const merged = deliveries.map((d) => {
    const live = liveLocations[d.orderId];
    return {
      ...d,
      courierLocation: live
        ? { lat: live.lat, lng: live.lng, etaMinutes: live.etaMinutes, updatedAt: live.updatedAt }
        : d.courierLocation,
    };
  });
  const withCourier = merged.filter((d) => d.courierLocation);

  const fitAll = () => {
    const points = merged.flatMap((d) => [
      ...(d.courierLocation ? [{ latitude: d.courierLocation.lat, longitude: d.courierLocation.lng }] : []),
      ...(d.deliveryAddress ? [{ latitude: d.deliveryAddress.lat, longitude: d.deliveryAddress.lng }] : []),
    ]);
    if (points.length === 0 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 90, right: 70, bottom: 120, left: 70 },
      animated: true,
    });
  };

  // Fit once per change in how many couriers are on screen — re-fitting on
  // every GPS tick would fight the customer panning around the map.
  const courierCount = withCourier.length;
  useEffect(() => {
    if (courierCount === 0) return;
    const id = setTimeout(fitAll, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the count, not the array identity
  }, [courierCount]);

  if (deliveriesQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (deliveries.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <EmptyState
          icon={Package}
          title={tr('tracking.empty.title')}
          description={tr('tracking.empty.desc')}
        />
      </SafeAreaView>
    );
  }

  const first = withCourier[0]?.courierLocation;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: first?.lat ?? deliveries[0]?.shopLat ?? PILOT_CITY_CENTER.latitude,
          longitude: first?.lng ?? deliveries[0]?.shopLng ?? PILOT_CITY_CENTER.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}>
        {merged.map((d) => (
          <View key={d.orderId}>
            {d.deliveryAddress && (
              <Marker
                coordinate={{ latitude: d.deliveryAddress.lat, longitude: d.deliveryAddress.lng }}
                title={tr('tracking.destination')}
                description={d.deliveryAddress.address}
                pinColor={colors.feedback.success}
                opacity={0.9}
              />
            )}
            {d.courierLocation && (
              <CourierMarker
                latitude={d.courierLocation.lat}
                longitude={d.courierLocation.lng}
                orderNumber={d.orderNumber}
                shopName={d.shopName}
                eta={
                  d.courierLocation.etaMinutes != null
                    ? tr('tracking.eta', { n: d.courierLocation.etaMinutes })
                    : tr('tracking.waiting')
                }
                onPress={() => router.push(`/orders/${d.orderId}`)}
              />
            )}
          </View>
        ))}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['bottom']} pointerEvents="box-none">
        <Pressable style={styles.fitBtn} onPress={fitAll} hitSlop={8} accessibilityLabel={tr('tracking.fitAll')}>
          <Maximize2 size={20} color={colors.brand.primary} strokeWidth={2.4} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

interface CourierMarkerProps {
  readonly latitude: number;
  readonly longitude: number;
  readonly orderNumber: string;
  readonly shopName: string;
  readonly eta: string;
  readonly onPress: () => void;
}

/**
 * Courier pin drawn as a custom view. Android only rasterises a custom marker
 * while `tracksViewChanges` is on, so it is kept on briefly after each move
 * and switched off again — leaving it on permanently makes the whole map
 * stutter on every GPS tick.
 */
function CourierMarker({ latitude, longitude, orderNumber, shopName, eta, onPress }: CourierMarkerProps) {
  const markerRef = useRef<MapMarker | null>(null);
  const [tracks, setTracks] = useState(true);
  const [trackedAt, setTrackedAt] = useState(`${latitude},${longitude}`);

  const at = `${latitude},${longitude}`;
  if (trackedAt !== at) {
    setTrackedAt(at);
    setTracks(true);
  }

  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 900);
    return () => clearTimeout(id);
  }, [at]);

  return (
    <Marker
      ref={markerRef}
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      onCalloutPress={onPress}>
      <View style={styles.courierPin}>
        <Bike size={17} color={colors.text.onPrimary} strokeWidth={2.6} />
      </View>
      <Callout tooltip onPress={onPress}>
        <View style={styles.callout}>
          <Text style={styles.calloutOrder}>#{orderNumber}</Text>
          <Text style={styles.calloutShop} numberOfLines={1}>
            {shopName}
          </Text>
          <Text style={styles.calloutEta}>{eta}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },

  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', padding: spacing.lg },
  fitBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },

  courierPin: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg.surface,
    ...shadow.md,
  },

  callout: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 140,
    ...shadow.md,
  },
  calloutOrder: { ...typography.bodyStrong, color: colors.text.primary },
  calloutShop: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  calloutEta: { ...typography.caption, color: colors.brand.primary, fontWeight: '800', marginTop: 3 },
});
