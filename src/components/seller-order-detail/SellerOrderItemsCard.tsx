import { Package, ScanBarcode } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { Order, OrderItem } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { fmt } from './types';

interface SellerOrderItemsCardProps {
  order: Order;
  onOpenMarkingScanner: (item: OrderItem) => void;
  isSavingMarking?: boolean;
}

export function SellerOrderItemsCard({
  order,
  onOpenMarkingScanner,
  isSavingMarking,
}: SellerOrderItemsCardProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{tr('shop.products')}</Text>
      {order.items.map((it) => {
        const remainingQty = it.quantity - it.returnedQuantity;
        const markingDone = (it.markingCodes?.length ?? 0) >= remainingQty;

        return (
          <View key={it.id} style={styles.itemRow}>
            <View style={styles.itemImageWrap}>
              {it.productVariant?.globalProduct?.photos?.[0] ? (
                <Image
                  source={{ uri: resolveMedia(it.productVariant.globalProduct.photos[0]) }}
                  style={styles.itemImage}
                />
              ) : (
                <View style={[styles.itemImage, styles.itemPlaceholder]}>
                  <Package size={18} color={colors.brand.primary} strokeWidth={1.7} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={2}>
                {it.productName}
              </Text>
              <Text style={styles.itemMeta}>
                {it.quantity} × {fmt(it.unitPrice)} {tr('common.som')}
                {it.returnedQuantity > 0
                  ? ` · ${tr('sellerOrder.returnedCount', { n: it.returnedQuantity })}`
                  : ''}
              </Text>
              {it.productVariant?.globalProduct?.taxCategory?.markingRequired ? (
                <Pressable
                  style={styles.markingRow}
                  onPress={() => onOpenMarkingScanner(it)}
                  disabled={isSavingMarking}
                >
                  <ScanBarcode
                    size={14}
                    color={markingDone ? colors.feedback.success : colors.feedback.warning}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.markingText,
                      markingDone ? styles.markingDone : styles.markingPending,
                    ]}
                  >
                    {tr('sellerOrder.marking', {
                      done: it.markingCodes?.length ?? 0,
                      total: remainingQty,
                    })}
                    {!markingDone ? ` — ${tr('sellerOrder.scanAction')}` : ''}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.itemTotal}>{fmt(it.lineTotal)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.overline, color: colors.text.secondary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemImageWrap: { width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden' },
  itemImage: { width: 48, height: 48, backgroundColor: colors.brand.primarySurface },
  itemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemName: { ...typography.bodySmall, fontWeight: '600', color: colors.text.primary },
  itemMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  markingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  markingText: { ...typography.caption, fontWeight: '700' },
  markingDone: { color: colors.feedback.success },
  markingPending: { color: colors.feedback.warning },
  itemTotal: { ...typography.bodySmall, fontWeight: '800', color: colors.text.primary },
});
