import { Crown, Store } from 'lucide-react-native';
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
  readonly shops: PublicShop[];
  readonly onPress: (shops: PublicShop[], lat: number, lng: number) => void;
}

export const MapClusterMarker = React.memo(function MapClusterMarker({
  latitude,
  longitude,
  count,
  shops,
  onPress,
}: Props) {
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 150);
    return () => clearTimeout(id);
  }, [count]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const hasPrime = shops.some((s) => s.isPrime === true);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={(e) => {
        e?.stopPropagation?.();
        haptics.selection();
        onPress(shops, latitude, longitude);
      }}
      zIndex={hasPrime ? 70 : 50}>
      <View style={[styles.halo, hasPrime && styles.haloPrime]}>
        <View style={[styles.circle, hasPrime && styles.circlePrime]}>
          {hasPrime ? (
            <Crown size={11} color="#F59E0B" strokeWidth={2.4} style={styles.icon} />
          ) : (
            <Store size={11} color={colors.text.onPrimary} strokeWidth={2.4} style={styles.icon} />
          )}
          <Text style={[styles.countText, hasPrime && styles.countTextPrime]} allowFontScaling={false}>
            {count}
          </Text>
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  halo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(232, 57, 46, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloPrime: {
    backgroundColor: 'rgba(245, 158, 11, 0.28)',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...shadow.md,
  },
  circlePrime: {
    backgroundColor: '#0F172A',
    borderColor: '#F59E0B',
    ...shadow.lg,
  },
  icon: {
    marginTop: -1,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  countTextPrime: {
    color: '#FEF3C7',
  },
});
