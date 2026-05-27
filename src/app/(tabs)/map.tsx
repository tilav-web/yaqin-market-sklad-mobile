import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';

export default function MapTab() {
  const coords = useEffectiveCoords();
  const refresh = useLocationStore((s) => s.refresh);
  const mapRef = useRef<MapView | null>(null);

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

  if (!coords) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={Brand.blue} />
        <Text style={styles.dim}>Lokatsiya kutilmoqda…</Text>
      </SafeAreaView>
    );
  }

  const initialRegion: Region = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton>
        {shopsQuery.data?.map((shop) => (
          <Marker
            key={shop.id}
            coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
            title={shop.name}
            description={`${shop.distanceKm?.toFixed(2)} km`}
            pinColor={Brand.red}
            onCalloutPress={() => router.push(`/shop/${shop.id}`)}
          />
        ))}
      </MapView>
      <View style={styles.topBanner}>
        <Text style={styles.bannerTitle}>
          {shopsQuery.data?.length ?? 0} ta do&apos;kon xaritada
        </Text>
        <Text style={styles.bannerSub}>
          Pinni bosing → do&apos;kon ma&apos;lumotini ko&apos;ring
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, backgroundColor: Brand.white },
  dim: { fontSize: 13, color: Brand.gray600 },
  topBanner: {
    position: 'absolute',
    top: Spacing.four,
    left: Spacing.four,
    right: Spacing.four,
    backgroundColor: Brand.white,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    shadowColor: Brand.black,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: Brand.blue },
  bannerSub: { fontSize: 12, color: Brand.gray600, marginTop: 2 },
});
