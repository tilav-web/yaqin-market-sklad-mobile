import { Heart, ShoppingBag, Star } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { VariantDetail } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';

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
    <View style={styles.imageWrap}>
      {product.photos[0] ? (
        <Image source={{ uri: resolveMedia(product.photos[0]) }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <ShoppingBag size={56} color={activeColors.brand.primary} strokeWidth={1.3} />
        </View>
      )}

      {/* Small info chips over the image */}
      {product.brand ? (
        <View style={styles.brandChip}>
          <Text style={styles.brandChipText}>{product.brand}</Text>
        </View>
      ) : null}

      <View style={styles.unitBadge}>
        <Text style={styles.unitBadgeText}>{unitLabel(product)}</Text>
      </View>

      {product.ratingCount > 0 && (
        <View style={styles.ratingChip}>
          <Star
            size={12}
            color={colors.feedback.warning}
            fill={colors.feedback.warning}
            strokeWidth={2}
          />
          <Text style={styles.ratingChipText}>
            {product.ratingAverage.toFixed(1)} ·{' '}
            {tr('product.reviewsN', { n: product.ratingCount })}
          </Text>
        </View>
      )}

      {outOfStock && (
        <View style={styles.outOverlay}>
          <View style={styles.outBadge}>
            <Text style={styles.outBadgeText}>{tr('product.outOfStock')}</Text>
          </View>
        </View>
      )}

      <Pressable style={styles.favBtn} hitSlop={12} onPress={onToggleFav}>
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

const styles = StyleSheet.create({
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 380,
    backgroundColor: colors.bg.surfaceMuted,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primarySurface,
  },
  brandChip: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  brandChipText: {
    ...typography.overline,
    color: colors.brand.primary,
  },
  favBtn: {
    position: 'absolute',
    top: spacing.lg + 48,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.overlay.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  unitBadgeText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.text.primary,
  },
  ratingChip: {
    position: 'absolute',
    bottom: spacing.xl + spacing.sm,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.overlay.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  ratingChipText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.text.primary,
  },
  outOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  outBadge: {
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  outBadgeText: {
    ...typography.bodyStrong,
    color: colors.text.onPrimary,
    fontWeight: '800',
  },
});
