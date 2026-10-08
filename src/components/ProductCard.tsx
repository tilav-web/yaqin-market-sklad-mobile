import { Plus, ShoppingBag, Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { trackAddToCart } from '@/lib/analyticsQueue';
import { resolveMedia } from '@/lib/api';
import { FeedProduct } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useTheme } from '@/stores/theme';
import { radius, shadow, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

interface Props {
  readonly product: FeedProduct;
  readonly onPress: () => void;
  readonly cardWidth?: number;
  /** Hide the shop name/distance chip (e.g. when already inside that shop). */
  readonly hideShopChip?: boolean;
}

/**
 * Modern Two-column Grid Product Card.
 *
 * Designed for marketplace & grocery shopping:
 * - High-clarity square media with discount badge & weight pill
 * - Clear 2-line title and store info
 * - Clean currency-formatted price
 * - Quick-add button that converts into an in-card [ - qty + ] counter
 * - Full light & dark theme support
 */
export function ProductCard({ product, onPress, cardWidth, hideShopChip }: Props) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const toast = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const lines = useCartStore((s) => s.carts[product.shopId] ?? EMPTY_CART);
  const updateQty = useCartStore((s) => s.updateQty);
  const inCart = lines.find((l) => l.variantId === product.id);

  const productName = getLocalizedText(product.name);
  const finalPrice = product.discountPrice ?? product.price;
  const hasDiscount =
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - finalPrice) / product.price) * 100)
    : 0;

  const photoUrl = product.photos && product.photos.length > 0 ? product.photos[0] : null;

  const handleAdd = (e: any) => {
    e.stopPropagation();
    haptics.light();
    addItem({
      variantId: product.id,
      shopId: product.shopId,
      shopName: product.shop.name,
      productName,
      unitPrice: finalPrice,
      quantity: 1,
      photoUrl: photoUrl ?? undefined,
    });
    trackAddToCart(product.shopId, product.id);
    toast.success(`${productName} ${tr('cart.addedToCart')}`);
  };

  const formattedDistance =
    product.shop?.distanceKm !== undefined && product.shop?.distanceKm !== null
      ? product.shop.distanceKm < 1
        ? `${Math.round(product.shop.distanceKm * 1000)}m`
        : `${product.shop.distanceKm.toFixed(1)} km`
      : null;

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: activeColors.bg.surface,
          borderColor: activeColors.border.subtle,
        },
        cardWidth ? { width: cardWidth } : { flex: 1, maxWidth: '48.8%' },
        pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
      ]}>
      {/* Product Image Area */}
      <View style={[styles.imageWrap, { backgroundColor: activeColors.bg.surfaceMuted }]}>
        {photoUrl ? (
          <Image
            source={{ uri: resolveMedia(photoUrl) }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              { backgroundColor: activeColors.brand.primarySurface },
            ]}>
            <ShoppingBag size={34} color={activeColors.brand.primary} strokeWidth={1.5} />
          </View>
        )}

        {hasDiscount && (
          <View style={[styles.discountBadge, { backgroundColor: activeColors.feedback.danger }]}>
            <Text style={styles.discountText}>−{discountPct}%</Text>
          </View>
        )}

        {product.unitSize ? (
          <View
            style={[
              styles.unitBadge,
              { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
            ]}>
            <Text style={styles.unitBadgeText}>
              {product.unitSize} {product.unitType || ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Card Details Body */}
      <View style={styles.body}>
        {/* Product Name */}
        <Text
          style={[styles.name, { color: activeColors.text.primary }]}
          numberOfLines={2}>
          {productName}
        </Text>

        {/* Shop Name & Distance */}
        {!hideShopChip && product.shop && (
          <View style={styles.shopChip}>
            <Store size={11} color={activeColors.text.tertiary} strokeWidth={2.2} />
            <Text
              style={[styles.shopName, { color: activeColors.text.secondary }]}
              numberOfLines={1}>
              {product.shop.name}
            </Text>
            {formattedDistance && (
              <>
                <Text style={[styles.shopDot, { color: activeColors.text.tertiary }]}>·</Text>
                <Text style={[styles.shopDistance, { color: activeColors.text.tertiary }]}>
                  {formattedDistance}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Price & Action Row */}
        <View style={styles.priceRow}>
          <View style={{ flex: 1, marginRight: 6 }}>
            {hasDiscount && (
              <Text
                style={[styles.oldPrice, { color: activeColors.text.hint }]}>
                {formatMoney(product.price)}
              </Text>
            )}
            <Text
              style={[styles.price, { color: activeColors.text.primary }]}
              numberOfLines={1}>
              {formatMoney(finalPrice)}{' '}
              <Text style={[styles.currency, { color: activeColors.text.secondary }]}>
                {tr('common.som')}
              </Text>
            </Text>
          </View>

          {/* Quick Counter or Add Button */}
          {inCart ? (
            <View
              style={[
                styles.qtyControl,
                { backgroundColor: activeColors.brand.primarySurface },
              ]}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity - 1);
                }}
                hitSlop={4}
                style={styles.qtyBtn}>
                <Text style={[styles.qtyMinus, { color: activeColors.brand.primary }]}>−</Text>
              </Pressable>
              <Text style={[styles.qtyValue, { color: activeColors.brand.primary }]}>
                {inCart.quantity}
              </Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity + 1);
                }}
                hitSlop={4}
                style={styles.qtyBtn}>
                <Text style={[styles.qtyPlus, { color: activeColors.brand.primary }]}>+</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleAdd}
              style={[
                styles.addBtn,
                { backgroundColor: activeColors.brand.primary },
              ]}
              hitSlop={6}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.8} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...shadow.sm,
  },
  imageWrap: {
    aspectRatio: 1,
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  discountText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10.5,
  },
  unitBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unitBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  body: {
    padding: spacing.sm + 2,
    gap: 4,
  },
  name: {
    ...typography.bodyStrong,
    fontSize: 13.5,
    lineHeight: 18,
    minHeight: 36,
    fontWeight: '700',
  },
  shopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  shopName: {
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  shopDot: {
    fontSize: 11,
  },
  shopDistance: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  oldPrice: {
    ...typography.caption,
    fontSize: 10.5,
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  price: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  currency: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: 3,
    height: 30,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyMinus: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  qtyPlus: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  qtyValue: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 12,
    minWidth: 16,
    textAlign: 'center',
  },
});
