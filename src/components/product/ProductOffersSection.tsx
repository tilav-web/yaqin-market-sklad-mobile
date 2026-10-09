import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ProductOffer } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface ProductOffersSectionProps {
  offers: ProductOffer[];
  currentVariantId: string;
  currentPrice: number;
  isLoading: boolean;
}

export function ProductOffersSection({
  offers,
  currentVariantId,
  currentPrice,
  isLoading,
}: ProductOffersSectionProps) {
  const { tr } = useTranslation();
  const others = offers.filter((o) => o.variantId !== currentVariantId);
  if (isLoading || others.length === 0) return null;

  const cheapestPrice = Math.min(...offers.map((o) => o.discountPrice ?? o.price));
  const SHOW = 5;
  const visible = others.slice(0, SHOW);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tr('prodDet.otherShops')}</Text>
      {visible.map((o, idx) => {
        const effectivePrice = o.discountPrice ?? o.price;
        const isCheapest = effectivePrice === cheapestPrice && idx === 0;
        const saving = currentPrice - effectivePrice;
        return (
          <Pressable
            key={o.variantId}
            style={styles.offerRow}
            onPress={() => {
              haptics.selection();
              router.push(`/product/${o.variantId}`);
            }}
          >
            <View style={styles.offerLeft}>
              <Text style={styles.offerShop} numberOfLines={1}>
                {o.shopName}
              </Text>
              <Text style={styles.offerMeta}>
                {o.isOpen ? tr('shop.open') : tr('shop.closed')}
                {o.distanceKm != null
                  ? ` · ${
                      o.distanceKm < 1
                        ? `${Math.round(o.distanceKm * 1000)} m`
                        : `${o.distanceKm.toFixed(1)} km`
                    }`
                  : ''}
              </Text>
            </View>
            <View style={styles.offerRight}>
              {isCheapest && (
                <View style={styles.cheapBadge}>
                  <Text style={styles.cheapBadgeText}>{tr('prodDet.cheapest')}</Text>
                </View>
              )}
              {saving > 0 && (
                <Text style={styles.savingText}>
                  −{saving.toLocaleString()} {tr('common.som')}
                </Text>
              )}
              <Text style={[styles.offerPrice, isCheapest && styles.offerPriceCheap]}>
                {effectivePrice.toLocaleString()}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {others.length > SHOW && (
        <Text style={styles.offersMore}>
          {tr('prodDet.moreShops', { n: others.length - SHOW })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  offerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  offerShop: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  offerMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  offerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  cheapBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  cheapBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  savingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.feedback.success,
  },
  offerPrice: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  offerPriceCheap: {
    color: colors.brand.primary,
  },
  offersMore: {
    ...typography.caption,
    color: colors.text.hint,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
