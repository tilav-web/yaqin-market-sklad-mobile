import { Plus, ShoppingBag, Store } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { FeedProduct } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly product: FeedProduct;
  readonly onPress: () => void;
  readonly cardWidth?: number;
  /** Hide the shop name/distance chip (e.g. when already inside that shop). */
  readonly hideShopChip?: boolean;
}

/**
 * Two-column grid product card.
 *
 * Visual hierarchy: photo → discount badge → name → shop chip → price → CTA.
 * The CTA collapses into a quantity counter once the variant is in the cart.
 */
export function ProductCard({ product, onPress, cardWidth, hideShopChip }: Props) {
  const { tr } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);
  const lines = useCartStore((s) => s.carts[product.shopId] ?? EMPTY_CART);
  const updateQty = useCartStore((s) => s.updateQty);
  const inCart = lines.find((l) => l.variantId === product.id);

  const finalPrice = product.discountPrice ?? product.price;
  const hasDiscount =
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - finalPrice) / product.price) * 100)
    : 0;

  const handleAdd = () => {
    haptics.success();
    addItem({
      variantId: product.id,
      shopId: product.shopId,
      shopName: product.shop.name,
      productName: product.name,
      unitPrice: finalPrice,
      quantity: 1,
      photoUrl: product.photos[0],
    });
  };

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        cardWidth ? { width: cardWidth } : null,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}>
      <View style={styles.imageWrap}>
        {product.photos[0] ? (
          <Image source={{ uri: resolveMedia(product.photos[0]) }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <ShoppingBag size={32} color={colors.brand.primary} strokeWidth={1.4} />
          </View>
        )}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>−{discountPct}%</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {!hideShopChip && (
          <View style={styles.shopChip}>
            <Store size={11} color={colors.text.tertiary} strokeWidth={2.4} />
            <Text style={styles.shopName} numberOfLines={1}>
              {product.shop.name}
            </Text>
            <Text style={styles.shopDot}>·</Text>
            <Text style={styles.shopDistance}>
              {product.shop.distanceKm.toFixed(1)} km
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <View style={{ flexShrink: 1 }}>
            {hasDiscount && (
              <Text style={styles.oldPrice}>{product.price.toLocaleString()}</Text>
            )}
            <Text style={styles.price}>{finalPrice.toLocaleString()}</Text>
          </View>
          {inCart ? (
            <View style={styles.qtyControl}>
              <Pressable
                onPress={() => {
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity - 1);
                }}
                style={styles.qtyBtn}>
                <Text style={styles.qtyMinus}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{inCart.quantity}</Text>
              <Pressable
                onPress={() => {
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity + 1);
                }}
                style={styles.qtyBtn}>
                <Text style={styles.qtyPlus}>+</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleAdd} style={styles.addBtn} hitSlop={8}>
              <Plus size={16} color={colors.text.onPrimary} strokeWidth={3} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    ...shadow.xs,
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: colors.bg.surfaceMuted,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primarySurface,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.brand.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  discountText: {
    ...typography.caption,
    color: colors.text.onAccent,
    fontWeight: '800',
    fontSize: 11,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyStrong,
    fontSize: 14,
    lineHeight: 18,
    minHeight: 36,
  },
  shopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shopName: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    flexShrink: 1,
  },
  shopDot: { ...typography.caption, color: colors.text.hint },
  shopDistance: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  oldPrice: {
    ...typography.caption,
    color: colors.text.hint,
    textDecorationLine: 'line-through',
  },
  price: {
    ...typography.priceSmall,
    fontSize: 15,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    height: 32,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyMinus: {
    fontSize: 18,
    color: colors.brand.primary,
    fontWeight: '800',
    lineHeight: 20,
  },
  qtyPlus: {
    fontSize: 18,
    color: colors.brand.primary,
    fontWeight: '800',
    lineHeight: 20,
  },
  qtyValue: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'center',
  },
});
