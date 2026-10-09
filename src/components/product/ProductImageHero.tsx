import { Heart, ShoppingBag, Star } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { VariantDetail } from '@/lib/types';
import { colors, typography } from '@/theme';

import { unitLabel } from './types';

interface ProductImageHeroProps {
  product: VariantDetail;
  isFav: boolean;
  outOfStock: boolean;
  onToggleFav: () => void;
  activeColors: {
    brand: { primary: string };
    bg: { surface: string; surfaceMuted: string };
  };
}

export function ProductImageHero({
  product,
  isFav,
  outOfStock,
  onToggleFav,
  activeColors,
}: ProductImageHeroProps) {
  const { tr } = useTranslation();

  return (
    <View
      className="w-full aspect-square max-h-[380px] relative"
      style={{ backgroundColor: colors.bg.surfaceMuted }}
    >
      {product.photos[0] ? (
        <Image source={{ uri: resolveMedia(product.photos[0]) }} className="w-full h-full" />
      ) : (
        <View
          className="w-full h-full items-center justify-center"
          style={{ backgroundColor: colors.brand.primarySurface }}
        >
          <ShoppingBag size={56} color={activeColors.brand.primary} strokeWidth={1.3} />
        </View>
      )}

      {/* Small info chips over the image */}
      {product.brand ? (
        <View
          className="absolute top-4 left-4 px-3 py-1 rounded-full"
          style={{ backgroundColor: colors.bg.surface }}
        >
          <Text style={[typography.overline, { color: colors.brand.primary }]}>
            {product.brand}
          </Text>
        </View>
      ) : null}

      <View
        className="absolute top-4 right-4 px-2 py-0.5 rounded-full"
        style={{ backgroundColor: colors.overlay.light }}
      >
        <Text className="font-extrabold" style={[typography.caption, { color: colors.text.primary }]}>
          {unitLabel(product)}
        </Text>
      </View>

      {product.ratingCount > 0 && (
        <View
          className="absolute bottom-6 left-4 flex-row items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.overlay.light }}
        >
          <Star
            size={12}
            color={colors.feedback.warning}
            fill={colors.feedback.warning}
            strokeWidth={2}
          />
          <Text className="font-extrabold" style={[typography.caption, { color: colors.text.primary }]}>
            {product.ratingAverage.toFixed(1)} ·{' '}
            {tr('product.reviewsN', { n: product.ratingCount })}
          </Text>
        </View>
      )}

      {outOfStock && (
        <View className="absolute inset-0 items-center justify-center bg-white/55">
          <View
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: colors.text.primary }}
          >
            <Text className="font-extrabold" style={[typography.bodyStrong, { color: colors.text.onPrimary }]}>
              {tr('product.outOfStock')}
            </Text>
          </View>
        </View>
      )}

      <Pressable
        className="absolute top-16 right-4 w-9 h-9 rounded-full bg-black/35 items-center justify-center"
        hitSlop={12}
        onPress={onToggleFav}
      >
        <Heart
          size={20}
          color={isFav ? activeColors.brand.primary : colors.text.onPrimary}
          fill={isFav ? activeColors.brand.primary : 'transparent'}
          strokeWidth={2.2}
        />
      </Pressable>
    </View>
  );
}
