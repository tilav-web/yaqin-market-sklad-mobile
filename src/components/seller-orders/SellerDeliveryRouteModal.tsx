import { MapPin, Navigation, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTranslation } from '@/i18n';
import { DeliveryRoute, DeliveryRouteStop } from '@/lib/types';
import { colors } from '@/theme';

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
      <View className="w-[26px] h-[26px] rounded-full bg-brand-primary items-center justify-center border-2 border-text-on-primary shadow-sm">
        <Text className="text-xs font-extrabold text-text-on-primary">{sequence}</Text>
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
      <View className="flex-1 bg-black/45 justify-end">
        <View className="bg-bg-surface rounded-t-3xl p-6 max-h-[88%] gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-text-primary">{tr('sellerOrders.route')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.text.primary} strokeWidth={2.4} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 32 }} />
          ) : !route?.stops.length ? (
            <View className="items-center py-10 gap-3">
              <MapPin size={28} color={colors.text.tertiary} strokeWidth={1.8} />
              <Text className="text-sm text-text-secondary">{tr('sellerOrders.routeEmpty')}</Text>
            </View>
          ) : (
            <>
              <MapView
                ref={routeMapRef}
                className="w-full h-[220px] rounded-2xl overflow-hidden"
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

              <ScrollView showsVerticalScrollIndicator={false} className="max-h-[320px]">
                {route.stops.map((stop, i) => (
                  <View key={stop.orderId} className="flex-row items-start gap-3 py-2.5 border-b border-border-subtle">
                    <View className="w-7 h-7 rounded-full bg-brand-primary items-center justify-center mt-0.5">
                      <Text className="text-xs text-text-on-primary font-extrabold">{i + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                        Buyurtma #{stop.orderNumber.slice(-6)}
                        {stop.customerPhone ? ` · ${stop.customerPhone}` : ''}
                      </Text>
                      <Text className="text-xs text-text-secondary mt-0.5 leading-4" numberOfLines={2}>
                        {stop.address}
                      </Text>
                      <Text className="text-xs text-brand-primary font-bold mt-0.5">
                        {stop.distanceFromPreviousKm.toFixed(1)} km oldingi nuqtadan
                      </Text>
                    </View>
                    <Pressable
                      className="flex-row items-center gap-1 self-center px-3 py-1.5 rounded-xl bg-brand-primary/10 active:opacity-75"
                      onPress={() => openDirections(stop.lat, stop.lng)}
                    >
                      <Navigation size={14} color={colors.brand.primary} strokeWidth={2.4} />
                      <Text className="text-xs text-brand-primary font-bold">{tr('sellerOrders.navigate')}</Text>
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
