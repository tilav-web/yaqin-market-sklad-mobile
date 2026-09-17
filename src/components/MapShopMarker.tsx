import {
  Apple,
  Croissant,
  Crown,
  Pill,
  ShoppingBag,
  Store,
  UtensilsCrossed,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';

import { PublicShop } from '@/lib/types';
import { colors, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly shop: PublicShop;
  readonly selected: boolean;
  readonly onPress: () => void;
}

interface CategoryConfig {
  bg: string;
  icon: React.ReactNode;
}

/**
 * Returns category color & icon based on shop name keywords.
 */
function getCategoryConfig(name: string, isPrime: boolean, closed: boolean): CategoryConfig {
  const size = 18;
  const color = '#FFFFFF';
  const strokeWidth = 2.2;

  if (closed) {
    return {
      bg: '#64748B',
      icon: <Store size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  if (isPrime) {
    return {
      bg: '#0F172A',
      icon: <Crown size={size + 1} color="#F59E0B" strokeWidth={2.4} />,
    };
  }

  const lower = name.toLowerCase();

  // Food / Cafe / Fast-food / Meat / Restaurant
  if (/go['’`]?sht|osh|kabob|burger|lavash|kafe|restoran|somsa|pizza|choyxona|shashlik|tandir/.test(lower)) {
    return {
      bg: '#E11D48', // Vibrant Crimson
      icon: <UtensilsCrossed size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  // Bakery / Pastry
  if (/non|novvoy|shirinlik|tort|pechenye|bakery|patir|pishiriq/.test(lower)) {
    return {
      bg: '#D97706', // Warm Amber Gold
      icon: <Croissant size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  // Pharmacy / Medical
  if (/dori|shifo|apteka|farm|tib|med/.test(lower)) {
    return {
      bg: '#0284C7', // Medical Sky Blue
      icon: <Pill size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  // Fruits / Organic / Green
  if (/meva|sabzavot|bog['’`]?|mevazor|poliz|chashma|organik|green/.test(lower)) {
    return {
      bg: '#059669', // Fresh Emerald Green
      icon: <Apple size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  // Supermarket / Store
  if (/super|market|bozor|savdo|store|minimarket|hyper/.test(lower)) {
    return {
      bg: '#2563EB', // Royal Blue
      icon: <ShoppingBag size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  return {
    bg: colors.brand.primary, // Brand Primary Blue
    icon: <Store size={size} color={color} strokeWidth={strokeWidth} />,
  };
}

// Vector Teardrop Pin Path in 42x50 canvas:
// Circle center: (21, 19), radius: 17. Needle tip: (21, 48).
const PIN_PATH = 'M 21 48 C 13.5 36.5 4 28.5 4 19 A 17 17 0 1 1 38 19 C 38 28.5 28.5 36.5 21 48 Z';

function MapShopMarkerComponent({ shop, selected, onPress }: Props) {
  // Allow initial render snapshot on Android, then freeze to keep 60 FPS
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTracks(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) {
    return null;
  }

  const closed = !shop.isOpenManual;
  const isPrime = shop.isPrime === true;
  const isFreeDelivery = (shop.deliveryFeeAtUser ?? 0) === 0 && shop.isDeliveryEnabled !== false && !closed;
  const config = getCategoryConfig(shop.name, isPrime, closed);

  // Selected pins get a bold dark outline and elevated zIndex
  const strokeColor = selected ? '#0F172A' : isPrime ? '#F59E0B' : '#FFFFFF';
  const strokeWidth = selected ? 3.2 : 2.2;

  return (
    <Marker
      coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
      tracksViewChanges={selected || tracks}
      anchor={{ x: 0.5, y: 0.94 }}
      onPress={(e) => {
        e?.stopPropagation?.();
        haptics.selection();
        onPress();
      }}
      zIndex={selected ? 999 : isPrime ? 120 : closed ? 10 : 40}>
      {/* 
        Constant fixed-size container (44x52):
        Because the container size NEVER changes when selected, Android Google Maps
        native texture never clips or resizes awkwardly.
      */}
      <View style={styles.markerBox}>
        <Svg width={42} height={50} viewBox="0 0 42 50">
          {/* Main Pin Teardrop */}
          <Path
            d={PIN_PATH}
            fill={config.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />

          {/* Integrated Free Delivery Dot (never clipped outside viewBox) */}
          {isFreeDelivery && !selected && !isPrime && (
            <Circle
              cx={34}
              cy={9}
              r={4.5}
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          )}
        </Svg>

        {/* Spacious, perfectly centered category icon */}
        <View style={styles.iconContainer} pointerEvents="none">
          {config.icon}
        </View>
      </View>
    </Marker>
  );
}

export const MapShopMarker = React.memo(
  MapShopMarkerComponent,
  (prev, next) =>
    prev.shop.id === next.shop.id &&
    prev.selected === next.selected &&
    prev.shop.isOpenManual === next.shop.isOpenManual &&
    prev.shop.isDeliveryOpenNow === next.shop.isDeliveryOpenNow &&
    prev.shop.isPrime === next.shop.isPrime &&
    prev.shop.ratingAverage === next.shop.ratingAverage &&
    prev.shop.deliveryFeeAtUser === next.shop.deliveryFeeAtUser,
);

const styles = StyleSheet.create({
  // Fixed bounds: 100% constant layout ensures Android native Bitmap never clips
  markerBox: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadow.md,
  },
  // Aligns precisely with circle center (21, 19) in 42x50 SVG
  iconContainer: {
    position: 'absolute',
    top: 9,
    left: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
