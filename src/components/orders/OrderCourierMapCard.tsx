import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useTranslation } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

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
    <View style={styles.mapCard}>
      <View style={styles.mapTitleRow}>
        <Text style={styles.mapTitle}>{tr('orderDet.courierLocation')}</Text>
        {courierLocation.etaMinutes != null ? (
          <Text style={styles.mapEta}>
            {tr('orderDet.courierEta', { n: courierLocation.etaMinutes })}
          </Text>
        ) : null}
      </View>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
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

const styles = StyleSheet.create({
  mapCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  mapTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  mapTitle: { ...typography.bodyStrong },
  mapEta: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  map: { width: '100%', height: 200 },
});
