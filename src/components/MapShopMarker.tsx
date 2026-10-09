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
import { View } from 'react-native';
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

  if (/go['’`]?sht|osh|kabob|burger|lavash|kafe|restoran|somsa|pizza|choyxona|shashlik|tandir/.test(lower)) {
    return {
      bg: '#E11D48',
      icon: <UtensilsCrossed size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  if (/non|novvoy|shirinlik|tort|pechenye|bakery|patir|pishiriq/.test(lower)) {
    return {
      bg: '#D97706',
      icon: <Croissant size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  if (/dori|shifo|apteka|farm|tib|med/.test(lower)) {
    return {
      bg: '#0284C7',
      icon: <Pill size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  if (/meva|sabzavot|bog['’`]?|mevazor|poliz|chashma|organik|green/.test(lower)) {
    return {
      bg: '#059669',
      icon: <Apple size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  if (/super|market|bozor|savdo|store|minimarket|hyper/.test(lower)) {
    return {
      bg: '#2563EB',
      icon: <ShoppingBag size={size} color={color} strokeWidth={strokeWidth} />,
    };
  }

  return {
    bg: colors.brand.primary,
    icon: <Store size={size} color={color} strokeWidth={strokeWidth} />,
  };
}

const PIN_PATH = 'M 21 48 C 13.5 36.5 4 28.5 4 19 A 17 17 0 1 1 38 19 C 38 28.5 28.5 36.5 21 48 Z';

function MapShopMarkerComponent({ shop, selected, onPress }: Props) {
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
      <View
        className="w-11 h-13 items-center justify-center relative"
        style={shadow.md}>
        <Svg width={42} height={50} viewBox="0 0 42 50">
          <Path
            d={PIN_PATH}
            fill={config.bg}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
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

        <View className="absolute top-2.25 left-3 w-5 h-5 items-center justify-center" pointerEvents="none">
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
