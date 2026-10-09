import { MapPin, Navigation, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTranslation } from '@/i18n';
import { DeliveryRoute, DeliveryRouteStop } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

import { openDirections } from './types';

interface SellerDeliveryRouteModalProps {
  visible: boolean;
  onClose: () => void;
  route?: DeliveryRoute;
  isLoading: boolean;
}

function RouteStopMarker({
  stop,
  sequence,
}: {
  readonly stop: DeliveryRouteStop;
  readonly sequence: number;
}) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: stop.lat, longitude: stop.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      title={`#${stop.orderNumber.slice(-6)}`}
      description={stop.address}
    >
      <View style={styles.stopPin}>
        <Text style={styles.stopPinText}>{sequence}</Text>
      </View>
    </Marker>
  );
}

export function SellerDeliveryRouteModal({
  visible,
  onClose,
  route,
  isLoading,
}: SellerDeliveryRouteModalProps) {
  const { tr } = useTranslation();
  const routeMapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!visible || !route?.stops.length) return;
    const coords = [
      { latitude: route.shopLocation.lat, longitude: route.shopLocation.lng },
      ...route.stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
    ];
    const id = setTimeout(() => {
      routeMapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 350);
    return () => clearTimeout(id);
  }, [visible, route]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.routeOverlay}>
        <View style={styles.routeSheet}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>{tr('sellerOrders.route')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.text.primary} strokeWidth={2.4} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 32 }} />
          ) : !route?.stops.length ? (
            <View style={styles.routeEmpty}>
              <MapPin size={28} color={colors.text.tertiary} strokeWidth={1.8} />
              <Text style={styles.routeEmptyText}>{tr('sellerOrders.routeEmpty')}</Text>
            </View>
          ) : (
            <>
              <MapView
                ref={routeMapRef}
                style={styles.routeMap}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: route.shopLocation.lat,
                  longitude: route.shopLocation.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: route.shopLocation.lat,
                    longitude: route.shopLocation.lng,
                  }}
                  pinColor="green"
                  title={tr('nav.shop')}
                  description={tr('sellerOrders.routeStart')}
                />
                {route.stops.map((stop, i) => (
                  <RouteStopMarker key={stop.orderId} stop={stop} sequence={i + 1} />
                ))}
              </MapView>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.routeList}>
                {route.stops.map((stop, i) => (
                  <View key={stop.orderId} style={styles.stopRow}>
                    <View style={styles.stopIndex}>
                      <Text style={styles.stopIndexText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopName} numberOfLines={1}>
                        Buyurtma #{stop.orderNumber.slice(-6)}
                        {stop.customerPhone ? ` · ${stop.customerPhone}` : ''}
                      </Text>
                      <Text style={styles.stopAddr} numberOfLines={2}>
                        {stop.address}
                      </Text>
                      <Text style={styles.stopDist}>
                        {stop.distanceFromPreviousKm.toFixed(1)} km oldingi nuqtadan
                      </Text>
                    </View>
                    <Pressable
                      style={styles.directionsBtn}
                      onPress={() => openDirections(stop.lat, stop.lng)}
                    >
                      <Navigation size={14} color={colors.brand.primary} strokeWidth={2.4} />
                      <Text style={styles.directionsBtnText}>{tr('sellerOrders.navigate')}</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  routeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  routeSheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '88%',
    gap: spacing.md,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  routeEmpty: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  routeEmptyText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  routeMap: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  routeList: {
    maxHeight: 320,
  },
  stopPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text.onPrimary,
    ...shadow.xs,
  },
  stopPinText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.onPrimary,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  stopIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stopIndexText: {
    ...typography.caption,
    color: colors.text.onPrimary,
    fontWeight: '800',
  },
  stopName: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  stopAddr: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  stopDist: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  directionsBtnText: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: '700',
  },
});
