import { Minus, Plus, Store, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { CartLine, PublicShop } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface CheckoutCartItemsCardProps {
  shop: PublicShop | undefined;
  cartLines: readonly CartLine[] | CartLine[];
  subTotal: number;
  deliveryFee: number;
  onUpdateQty: (variantId: string, quantity: number) => void;
}

export function CheckoutCartItemsCard({
  shop,
  cartLines,
  subTotal,
  deliveryFee,
  onUpdateQty,
}: CheckoutCartItemsCardProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.section}>
      <View style={styles.shopRow}>
        <View style={styles.shopIcon}>
          <Store size={16} color={colors.brand.primary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>
            {shop?.name ?? tr('checkout.itemsTitle')}
          </Text>
          <Text style={styles.shopMeta}>{tr('cart.itemsCount', { n: cartLines.length })}</Text>
        </View>
      </View>

      {cartLines.map((line, i) => (
        <View key={line.variantId} style={[styles.cartItem, i > 0 && styles.cartItemBordered]}>
          <View style={styles.itemThumb}>
            {line.photoUrl ? (
              <Image source={{ uri: resolveMedia(line.photoUrl) }} style={styles.itemImg} />
            ) : (
              <View style={[styles.itemImg, styles.itemImgPlaceholder]} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={2}>
              {line.productName}
            </Text>
            <Text style={styles.itemPrice}>
              {(line.unitPrice * line.quantity).toLocaleString()} {tr('common.som')}
            </Text>
          </View>
          <View style={styles.qtyControls}>
            <Pressable
              style={styles.qtyBtn}
              hitSlop={4}
              onPress={() => {
                haptics.light();
                onUpdateQty(line.variantId, line.quantity - 1);
              }}
            >
              {line.quantity === 1 ? (
                <Trash2 size={15} color={colors.brand.primary} strokeWidth={2.4} />
              ) : (
                <Minus size={16} color={colors.brand.primary} strokeWidth={3} />
              )}
            </Pressable>
            <Text style={styles.qty}>{line.quantity}</Text>
            <Pressable
              style={styles.qtyBtn}
              hitSlop={4}
              onPress={() => {
                haptics.light();
                onUpdateQty(line.variantId, line.quantity + 1);
              }}
            >
              <Plus size={16} color={colors.brand.primary} strokeWidth={3} />
            </Pressable>
          </View>
        </View>
      ))}

      <View style={styles.divider} />
      <Row label={tr('cart.subtotal')} value={`${subTotal.toLocaleString()} ${tr('common.som')}`} />
      <Row
        label={tr('cart.deliveryFee')}
        value={
          !shop
            ? '—'
            : deliveryFee === 0
              ? tr('shop.freeShort')
              : `${deliveryFee.toLocaleString()} ${tr('common.som')}`
        }
        free={!!shop && deliveryFee === 0}
      />
    </View>
  );
}

function Row({
  label,
  value,
  free,
}: {
  readonly label: string;
  readonly value: string;
  readonly free?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, free && styles.rowValueFree]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shopIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...typography.h4, color: colors.text.primary },
  shopMeta: { ...typography.caption, color: colors.text.tertiary },
  cartItem: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'center' },
  cartItemBordered: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg.surfaceMuted,
  },
  itemImg: { width: '100%', height: '100%' },
  itemImgPlaceholder: { backgroundColor: colors.brand.primarySurface },
  itemName: { ...typography.bodySmall, color: colors.text.primary, fontWeight: '600' },
  itemPrice: { ...typography.priceSmall, marginTop: 2 },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.full,
    paddingHorizontal: 4,
  },
  qtyBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qty: { ...typography.bodyStrong, color: colors.brand.primary, minWidth: 20, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowValue: { ...typography.body, fontWeight: '600' },
  rowValueFree: { color: colors.feedback.success, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginTop: spacing.sm, marginBottom: spacing.md },
});
