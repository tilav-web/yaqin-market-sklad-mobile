import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
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
      <View className="w-14 h-14 items-center justify-center">
        <View
          className={`items-center justify-center ${
            isLarge ? 'w-11 h-11 rounded-full border-[3px]' : 'w-9.5 h-9.5 rounded-full border-[2.6px]'
          }`}
          style={[
            {
              backgroundColor: hasPrime ? '#0F172A' : colors.brand.primary,
              borderColor: hasPrime ? '#F59E0B' : '#FFFFFF',
            },
            hasPrime ? shadow.lg : shadow.md,
          ]}>
          <Text
            className={`font-black text-center ${
              isLarge ? 'text-[15px]' : 'text-sm'
            }`}
            style={{ color: hasPrime ? '#FEF3C7' : '#FFFFFF' }}
            allowFontScaling={false}>
            {count}
          </Text>
        </View>
      </View>
    </Marker>
  );
});
