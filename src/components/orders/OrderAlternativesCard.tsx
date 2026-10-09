import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { OrderItem, ProductOffer } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

interface OrderAlternativesCardProps {
  items: OrderItem[];
  offersByItem: ProductOffer[][];
  hasNoOffers: boolean;
  onSelectProduct: (variantId: string) => void;
}

export function OrderAlternativesCard({
  items,
  offersByItem,
  hasNoOffers,
  onSelectProduct,
}: OrderAlternativesCardProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tr('orders.findElsewhereTitle')}</Text>
      {items.map((it, idx) => {
        const offers = (offersByItem[idx] ?? []).slice(0, 5);
        if (offers.length === 0) return null;
        return (
          <View key={it.id} style={styles.altGroup}>
            <Text style={styles.altGroupTitle}>{getLocalizedText(it.productName)}</Text>
            {offers.map((o) => (
              <Pressable
                key={o.variantId}
                style={styles.offerRow}
                onPress={() => {
                  haptics.selection();
                  onSelectProduct(o.variantId);
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerShop} numberOfLines={1}>{o.shopName}</Text>
                  <Text style={styles.offerMeta}>
                    {o.isOpen ? tr('shop.open') : tr('shop.closed')}
                    {o.distanceKm != null
                      ? ` · ${o.distanceKm < 1 ? `${Math.round(o.distanceKm * 1000)} m` : `${o.distanceKm.toFixed(1)} km`}`
                      : ''}
                  </Text>
                </View>
                <Text style={styles.offerPrice}>
                  {(o.discountPrice ?? o.price).toLocaleString()} {tr('common.som')}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      {hasNoOffers && (
        <Text style={styles.altEmpty}>{tr('orders.findElsewhereEmpty')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
  },
  sectionTitle: { ...typography.h3, fontSize: 16 },
  altGroup: { gap: spacing.xs },
  altGroupTitle: { ...typography.bodyStrong, fontSize: 13, color: colors.text.secondary },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  offerShop: { ...typography.bodyStrong, fontSize: 14 },
  offerMeta: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  offerPrice: { ...typography.bodyStrong, fontSize: 14, color: colors.brand.primary },
  altEmpty: { ...typography.bodySmall, color: colors.text.tertiary, fontStyle: 'italic' },
});
