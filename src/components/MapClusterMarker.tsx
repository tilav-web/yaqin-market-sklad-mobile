import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { PublicShop } from '@/lib/types';
import { colors, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly count: number;
  readonly expansionZoom?: number;
  readonly shops: PublicShop[];
  readonly onPress: (shops: PublicShop[], lat: number, lng: number, expansionZoom?: number) => void;
}

export const MapClusterMarker = React.memo(function MapClusterMarker({
  latitude,
  longitude,
  count,
  expansionZoom,
  shops,
  onPress,
}: Props) {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const hasPrime = shops.some((s) => s.isPrime === true);
  const isLarge = count >= 10;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={(e) => {
        e?.stopPropagation?.();
        haptics.selection();
        onPress(shops, latitude, longitude, expansionZoom);
      }}
      zIndex={hasPrime ? 80 : 50}>
      {/* Fixed generous container prevents clipping on Android bitmap rasterizer */}
      <View style={styles.fixedContainer}>
        <View
          style={[
            styles.badge,
            isLarge && styles.badgeLarge,
            hasPrime && styles.badgePrime,
          ]}>
          <Text
            style={[styles.countText, isLarge && styles.countTextLarge, hasPrime && styles.countTextPrime]}
            allowFontScaling={false}>
            {count}
          </Text>
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  fixedContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.6,
    borderColor: '#FFFFFF',
    ...shadow.md,
  },
  badgeLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
  },
  badgePrime: {
    backgroundColor: '#0F172A',
    borderColor: '#F59E0B',
    borderWidth: 2.6,
    ...shadow.lg,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  countTextLarge: {
    fontSize: 15,
  },
  countTextPrime: {
    color: '#FEF3C7',
  },
});
