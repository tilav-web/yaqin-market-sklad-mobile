import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { OrderItem } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { getLocalizedText } from '@/utils/text';

interface OrderItemsCardProps {
  items: OrderItem[];
  hasReturns: boolean;
}

export function OrderItemsCard({ items, hasReturns }: OrderItemsCardProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tr('shop.products')}</Text>
      {items.map((it) => {
        const photo = it.productVariant?.globalProduct?.photos?.[0];
        return (
          <View key={it.id} style={styles.itemRow}>
            {photo ? (
              <Image source={{ uri: resolveMedia(photo) }} style={styles.itemImage} />
            ) : (
              <View style={styles.itemImage} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{getLocalizedText(it.productName)}</Text>
              <Text style={styles.itemQty}>
                {it.quantity} × {it.unitPrice.toLocaleString()} {tr('common.som')}
              </Text>
              {hasReturns && it.returnedQuantity > 0 && (
                <Text style={styles.returnedTag}>
                  {tr('orderDet.returnedCount', { n: it.returnedQuantity })}
                </Text>
              )}
            </View>
            <Text style={styles.itemTotal}>{it.lineTotal.toLocaleString()}</Text>
          </View>
        );
      })}
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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.bg.canvas,
  },
  itemName: { ...typography.bodyStrong },
  itemQty: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  returnedTag: { ...typography.caption, color: colors.feedback.warning, marginTop: 2 },
  itemTotal: { ...typography.bodyStrong },
});
