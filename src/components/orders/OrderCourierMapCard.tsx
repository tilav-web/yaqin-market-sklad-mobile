import React, { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTranslation } from '@/i18n';
import { colors, typography } from '@/theme';

interface OrderCourierMapCardProps {
  courierLocation: {
    lat: number;
    lng: number;
    etaMinutes?: number | null;
  };
  deliveryAddress?: {
    latitude: number;
    longitude: number;
  } | null;
}

export function OrderCourierMapCard({ courierLocation, deliveryAddress }: OrderCourierMapCardProps) {
  const { tr } = useTranslation();
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!courierLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: courierLocation.lat, longitude: courierLocation.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400,
    );
  }, [courierLocation]);

  return (
    <View
      className="rounded-2xl overflow-hidden border"
      style={{
        backgroundColor: colors.bg.surface,
        borderColor: colors.border.subtle,
      }}
    >
      <View className="flex-row justify-between items-center p-3">
        <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>
          {tr('orderDet.courierLocation')}
        </Text>
        {courierLocation.etaMinutes != null ? (
          <Text className="font-bold" style={[typography.caption, { color: colors.brand.primary }]}>
            {tr('orderDet.courierEta', { n: courierLocation.etaMinutes })}
          </Text>
        ) : null}
      </View>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        className="w-full h-[200px]"
        initialRegion={{
          latitude: courierLocation.lat,
          longitude: courierLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}>
        <Marker
          coordinate={{ latitude: courierLocation.lat, longitude: courierLocation.lng }}
          title={tr('orderDet.courierPin')}
          pinColor={colors.brand.primary}
        />
        {deliveryAddress && (
          <Marker
            coordinate={{
              latitude: deliveryAddress.latitude,
              longitude: deliveryAddress.longitude,
            }}
            title={tr('orderDet.youPin')}
            pinColor={colors.feedback.success}
          />
        )}
      </MapView>
    </View>
  );
}
