import { Minus, Plus, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface ProductBottomBarProps {
  outOfStock: boolean;
  quantityInCart?: number;
  onAddToCart: () => void;
  onUpdateQty: (delta: number) => void;
  onGoToCart: () => void;
  activeColors: {
    bg: { surface: string };
    border: { subtle: string };
  };
}

export function ProductBottomBar({
  outOfStock,
  quantityInCart,
  onAddToCart,
  onUpdateQty,
  onGoToCart,
  activeColors,
}: ProductBottomBarProps) {
  const { tr } = useTranslation();

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.footer,
        {
          backgroundColor: activeColors.bg.surface,
          borderTopColor: activeColors.border.subtle,
        },
      ]}
    >
      {outOfStock ? (
        <View style={[styles.addBtn, styles.addBtnDisabled]}>
          <Text style={styles.addBtnText}>{tr('product.outOfStock')}</Text>
        </View>
      ) : quantityInCart && quantityInCart > 0 ? (
        <View style={styles.footerRow}>
          <View style={styles.qtyControl}>
            <Pressable onPress={() => onUpdateQty(-1)} style={styles.qtyBtn}>
              <Minus size={18} color={colors.brand.primary} strokeWidth={3} />
            </Pressable>
            <Text style={styles.qtyValue}>{quantityInCart}</Text>
            <Pressable onPress={() => onUpdateQty(1)} style={styles.qtyBtn}>
              <Plus size={18} color={colors.brand.primary} strokeWidth={3} />
            </Pressable>
          </View>
          <Pressable style={styles.goCartBtn} onPress={onGoToCart}>
            <ShoppingCart size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
            <Text style={styles.goCartText}>{tr('product.goToCart')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onAddToCart}
          disabled={outOfStock}
          style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
        >
          <ShoppingBag size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
          <Text style={styles.addBtnText}>
            {outOfStock ? tr('shop.outOfStock') : tr('prodDet.addToCart')}
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    borderRadius: radius.md,
    height: layout.buttonHeight.md,
    backgroundColor: colors.brand.primarySurface,
  },
  qtyBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    ...typography.bodyStrong,
    color: colors.brand.primary,
    minWidth: 28,
    textAlign: 'center',
  },
  goCartBtn: {
    flex: 1,
    height: layout.buttonHeight.md,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  goCartText: {
    ...typography.button,
    color: colors.text.onPrimary,
  },
  addBtn: {
    height: layout.buttonHeight.md,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addBtnDisabled: {
    backgroundColor: colors.border.default,
  },
  addBtnText: {
    ...typography.button,
    color: colors.text.onPrimary,
  },
});
