import {
  Apple,
  Croissant,
  Crown,
  HeartPulse,
  ShoppingBag,
  Star,
  Store,
  Utensils,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { PublicShop } from '@/lib/types';
import { colors, radius, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly shop: PublicShop;
  readonly selected: boolean;
  readonly onPress: () => void;
}

/**
 * Returns a fitting Lucide icon element based on shop name/keywords.
 */
function renderShopCategoryIcon(name: string, selected: boolean) {
  const lower = name.toLowerCase();
  const size = selected ? 19 : 16;
  const color = colors.text.onPrimary;
  const strokeWidth = 2.4;

  if (/go['’`]?sht|osh|kabob|burger|lavash|kafe|restoran|somsa/.test(lower)) {
    return <Utensils size={size} color={color} strokeWidth={strokeWidth} />;
  }
  if (/non|novvoy|tandir|shirinlik|tort|pechenye|bakery/.test(lower)) {
    return <Croissant size={size} color={color} strokeWidth={strokeWidth} />;
  }
  if (/dori|shifo|apteka|farm/.test(lower)) {
    return <HeartPulse size={size} color={color} strokeWidth={strokeWidth} />;
  }
  if (/meva|sabzavot|bog['’`]?|mevazor|poliz|chashma/.test(lower)) {
    return <Apple size={size} color={color} strokeWidth={strokeWidth} />;
  }
  if (/super|market|bozor|savdo|store/.test(lower)) {
    return <ShoppingBag size={size} color={color} strokeWidth={strokeWidth} />;
  }
  return <Store size={size} color={color} strokeWidth={strokeWidth} />;
}

function MapShopMarkerComponent({ shop, selected, onPress }: Props) {
  // CRITICAL PERFORMANCE: track view changes only briefly on initial render or
  // selection change, then freeze snapshot to avoid Android map repaint stutter.
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const anim = requestAnimationFrame(() => setTracks(true));
    const timer = setTimeout(() => setTracks(false), 220);
    return () => {
      cancelAnimationFrame(anim);
      clearTimeout(timer);
    };
  }, [selected]);

  if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) {
    return null;
  }

  const closed = !shop.isOpenManual;
  const isShowcase = shop.isDeliveryEnabled === false;
  const isFreeDelivery = (shop.deliveryFeeAtUser ?? 0) === 0 && !isShowcase && !closed;
  const hasRating = shop.ratingAverage >= 4.0;
  const isPrime = shop.isPrime === true;

  return (
    <Marker
      coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
      onPress={(e) => {
        e?.stopPropagation?.();
        haptics.selection();
        onPress();
      }}
      zIndex={selected ? 999 : isPrime ? 80 : closed ? 10 : 20}>
      <View style={[styles.wrap, closed && styles.wrapClosed]}>
        {/* Prime shops always have their signature floating gold capsule */}
        {isPrime && !closed ? (
          <View style={[styles.primeFloatingCapsule, selected && styles.primeFloatingCapsuleSelected]}>
            <View style={styles.primeCrownBadge}>
              <Crown size={9} color="#B45309" strokeWidth={2.6} />
            </View>
            <Text style={styles.primeFloatingText} numberOfLines={1}>
              {shop.name}
            </Text>
            {hasRating && (
              <Text style={styles.primeRatingText}>
                ⭐{shop.ratingAverage.toFixed(1)}
              </Text>
            )}
          </View>
        ) : hasRating && !closed ? (
          /* Top-rated standard shops have a micro rating pill */
          <View style={[styles.microRatingPill, selected && styles.microRatingPillSelected]}>
            <Star size={8} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.microRatingText}>
              {shop.ratingAverage.toFixed(1)}
            </Text>
          </View>
        ) : null}

        {/* Pin body */}
        <View
          style={[
            styles.pinCircle,
            selected && styles.pinCircleSelected,
            closed && styles.pinCircleClosed,
            isShowcase && !closed && styles.pinCircleShowcase,
            isFreeDelivery && !selected && !isPrime && styles.pinCircleFree,
            isPrime && !closed && styles.pinCirclePrime,
          ]}>
          {isPrime && !closed ? (
            <Crown
              size={selected ? 22 : 18}
              color="#F59E0B"
              strokeWidth={2.4}
            />
          ) : (
            renderShopCategoryIcon(shop.name, selected)
          )}
        </View>

        {/* Pointer tail */}
        <View
          style={[
            styles.tail,
            selected && styles.tailSelected,
            closed && styles.tailClosed,
            isShowcase && !closed && styles.tailShowcase,
            isFreeDelivery && !selected && !isPrime && styles.tailFree,
            isPrime && !closed && styles.tailPrime,
          ]}
        />
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
    prev.shop.isPrime === next.shop.isPrime,
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapClosed: {
    opacity: 0.65,
  },

  // Floating micro rating pill
  microRatingPill: {
    position: 'absolute',
    top: -10,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    ...shadow.sm,
    zIndex: 5,
  },
  microRatingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
  },

  // Prime floating capsule (always-visible name & crown for prime shops)
  primeFloatingCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginBottom: 4,
    maxWidth: 160,
    ...shadow.md,
  },
  primeCrownBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primeFloatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    flexShrink: 1,
  },
  primeRatingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },

  // Selected banner
  primeFloatingCapsuleSelected: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    transform: [{ scale: 1.06 }],
  },
  microRatingPillSelected: {
    borderColor: colors.brand.primary,
    borderWidth: 1.5,
    transform: [{ scale: 1.1 }],
  },

  // Pin circle
  pinCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...shadow.md,
  },
  pinCircleSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: colors.brand.primary,
    transform: [{ scale: 1.1 }],
    ...shadow.lg,
  },
  pinCirclePrime: {
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    borderColor: '#F59E0B',
    ...shadow.lg,
  },
  pinCircleClosed: {
    backgroundColor: '#94A3B8',
    borderColor: '#F1F5F9',
  },
  pinCircleShowcase: {
    backgroundColor: '#2563EB',
    borderColor: '#FFFFFF',
  },
  pinCircleFree: {
    backgroundColor: '#E8392E',
    borderColor: '#FEF08A', // Gold border accent for free delivery shops
  },

  // Pointer tail
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.brand.primary,
    marginTop: -1,
  },
  tailSelected: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderTopColor: colors.brand.primary,
    marginTop: -2,
  },
  tailPrime: {
    borderTopColor: '#0F172A',
  },
  tailClosed: {
    borderTopColor: '#94A3B8',
  },
  tailShowcase: {
    borderTopColor: '#2563EB',
  },
  tailFree: {
    borderTopColor: '#E8392E',
  },
});
