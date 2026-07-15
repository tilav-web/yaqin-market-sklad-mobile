import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Clock, MapPin, Package, Store } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { ORDER_STATUS_KEY, OrderStatus } from '@/lib/types';
import { useMultiOrderSocket } from '@/lib/useMultiOrderSocket';
import { colors, layout, radius, spacing, typography } from '@/theme';

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

// Distinct marker colors so several couriers on one map stay tellable apart.
const MARKER_COLORS = [colors.brand.primary, '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777'];

export default function TrackingScreen() {
  const { tr } = useTranslation();
  const mapRef = useRef<MapView | null>(null);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);

  const deliveriesQuery = useQuery({
    queryKey: ['orders', 'active-deliveries'],
    queryFn: async () => (await api.get<ActiveDelivery[]>('/orders/active-deliveries')).data,
    refetchInterval: 15_000,
  });

  const deliveries = deliveriesQuery.data ?? [];
  const orderIds = useMemo(() => deliveries.map((d) => d.orderId), [deliveries]);
  const liveLocations = useMultiOrderSocket(orderIds);

  // REST snapshot merged with live socket updates — socket wins once it has
  // spoken for an order, otherwise fall back to whatever the last fetch saw.
  const withLiveLocation = deliveries.map((d) => ({
    ...d,
    courierLocation: liveLocations[d.orderId]
      ? { lat: liveLocations[d.orderId].lat, lng: liveLocations[d.orderId].lng, etaMinutes: liveLocations[d.orderId].etaMinutes, updatedAt: liveLocations[d.orderId].updatedAt }
      : d.courierLocation,
  }));

  const withCourier = withLiveLocation.filter((d) => d.courierLocation);

  // Fit the map to every visible courier + delivery pin whenever the set changes.
  useEffect(() => {
    if (withCourier.length === 0 || !mapRef.current) return;
    const points = withCourier.flatMap((d) => [
      { latitude: d.courierLocation!.lat, longitude: d.courierLocation!.lng },
      ...(d.deliveryAddress ? [{ latitude: d.deliveryAddress.lat, longitude: d.deliveryAddress.lng }] : []),
    ]);
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 60, right: 60, bottom: 220, left: 60 },
      animated: true,
    });
    // Re-fit only when the number of tracked couriers changes, not on every tick —
    // fitting on every 10s GPS update would fight the user zooming/panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed off count, not the array identity
  }, [withCourier.length]);

  function focusOn(delivery: ActiveDelivery) {
    setFocusedOrderId(delivery.orderId);
    if (!delivery.courierLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: delivery.courierLocation.lat, longitude: delivery.courierLocation.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400,
    );
  }

  if (!deliveriesQuery.isLoading && deliveries.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          icon={Package}
          title="Faol buyurtma yo'q"
          description="Hozircha yo'lda buyurtmangiz yo'q — bu yerda barcha faol buyurtmalaringizni bitta xaritada kuzatib borasiz."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: withCourier[0]?.courierLocation?.lat ?? deliveries[0]?.shopLat ?? 41.0,
            longitude: withCourier[0]?.courierLocation?.lng ?? deliveries[0]?.shopLng ?? 69.0,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}>
          {withLiveLocation.map((d, i) => {
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            return (
              <View key={d.orderId}>
                {d.courierLocation ? (
                  <Marker
                    coordinate={{ latitude: d.courierLocation.lat, longitude: d.courierLocation.lng }}
                    title={`${d.shopName} — #${d.orderNumber}`}
                    description={d.courierLocation.etaMinutes ? `~${d.courierLocation.etaMinutes} daqiqada` : undefined}
                    pinColor={color}
                  />
                ) : null}
                {d.deliveryAddress ? (
                  <Marker
                    coordinate={{ latitude: d.deliveryAddress.lat, longitude: d.deliveryAddress.lng }}
                    title="Yetkazish manzili"
                    pinColor={colors.feedback.success}
                  />
                ) : null}
              </View>
            );
          })}
        </MapView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
        {withLiveLocation.map((d, i) => {
          const color = MARKER_COLORS[i % MARKER_COLORS.length];
          const focused = focusedOrderId === d.orderId;
          return (
            <Pressable
              key={d.orderId}
              style={[styles.card, focused && styles.cardFocused]}
              onPress={() => {
                focusOn(d);
                router.push(`/orders/${d.orderId}`);
              }}>
              <View style={styles.cardHead}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.cardOrderNum} numberOfLines={1}>
                  #{d.orderNumber}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Store size={13} color={colors.text.tertiary} strokeWidth={2.2} />
                <Text style={styles.cardShop} numberOfLines={1}>
                  {d.shopName}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.status[d.status] }]}>
                <Text style={styles.statusText}>{tr(ORDER_STATUS_KEY[d.status])}</Text>
              </View>
              {d.courierLocation?.etaMinutes != null ? (
                <View style={styles.cardRow}>
                  <Clock size={13} color={colors.brand.primary} strokeWidth={2.2} />
                  <Text style={styles.eta}>~{d.courierLocation.etaMinutes} daqiqa</Text>
                </View>
              ) : d.status === 'delivering' ? (
                <View style={styles.cardRow}>
                  <MapPin size={13} color={colors.text.tertiary} strokeWidth={2.2} />
                  <Text style={styles.cardWaiting}>Joylashuv kutilmoqda…</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  cards: { padding: layout.screenPadding, gap: spacing.sm },
  card: {
    width: 176,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
  },
  cardFocused: { borderColor: colors.brand.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardOrderNum: { ...typography.bodyStrong, color: colors.text.primary, flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardShop: { ...typography.caption, color: colors.text.secondary, flex: 1 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  statusText: { ...typography.caption, fontSize: 10, color: colors.text.onPrimary, fontWeight: '800' },
  eta: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  cardWaiting: { ...typography.caption, color: colors.text.tertiary },
});
