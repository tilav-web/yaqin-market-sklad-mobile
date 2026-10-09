import { Plus, ShoppingBag, Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { trackAddToCart } from '@/lib/analyticsQueue';
import { resolveMedia } from '@/lib/api';
import { FeedProduct } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useTheme } from '@/stores/theme';
import { shadow } from '@/theme';
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
    <View style={cardWidth ? { width: cardWidth } : { flex: 1, maxWidth: '48.8%' }}>
      <Pressable
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        className="w-full rounded-2xl border overflow-hidden"
        style={({ pressed }) => [
          {
            backgroundColor: activeColors.bg.surface,
            borderColor: activeColors.border.subtle,
          },
          shadow.sm,
          pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
        ]}>
      {/* Product Image Area */}
      <View
        className="w-full aspect-square relative"
        style={{ backgroundColor: activeColors.bg.surfaceMuted }}>
        {photoUrl ? (
          <Image
            source={{ uri: resolveMedia(photoUrl) }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full h-full items-center justify-center"
            style={{ backgroundColor: activeColors.brand.primarySurface }}>
            <ShoppingBag size={34} color={activeColors.brand.primary} strokeWidth={1.5} />
          </View>
        )}

        {hasDiscount && (
          <View
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: activeColors.feedback.danger }}>
            <Text className="text-white font-extrabold text-[10.5px]">−{discountPct}%</Text>
          </View>
        )}

        {product.unitSize ? (
          <View
            className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}>
            <Text className="text-white font-bold text-[10px]">
              {product.unitSize} {product.unitType || ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Card Details Body */}
      <View className="p-2.5 gap-1">
        {/* Product Name */}
        <Text
          className="text-[13.5px] leading-[18px] min-h-[36px] font-bold"
          style={{ color: activeColors.text.primary }}
          numberOfLines={2}>
          {productName}
        </Text>

        {/* Shop Name & Distance */}
        {!hideShopChip && product.shop && (
          <View className="flex-row items-center gap-1 mt-0.5">
            <Store size={11} color={activeColors.text.tertiary} strokeWidth={2.2} />
            <Text
              className="text-[11.5px] font-semibold flex-shrink"
              style={{ color: activeColors.text.secondary }}
              numberOfLines={1}>
              {product.shop.name}
            </Text>
            {formattedDistance && (
              <>
                <Text className="text-[11px]" style={{ color: activeColors.text.tertiary }}>
                  ·
                </Text>
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: activeColors.text.tertiary }}>
                  {formattedDistance}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Price & Action Row */}
        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-1 mr-1.5">
            {hasDiscount && (
              <Text
                className="text-[10.5px] line-through mb-0.5"
                style={{ color: activeColors.text.hint }}>
                {formatMoney(product.price)}
              </Text>
            )}
            <Text
              className="text-[13.5px] font-extrabold"
              style={{ color: activeColors.text.primary }}
              numberOfLines={1}>
              {formatMoney(finalPrice)}{' '}
              <Text className="text-[10.5px] font-semibold" style={{ color: activeColors.text.secondary }}>
                {tr('common.som')}
              </Text>
            </Text>
          </View>

          {/* Quick Counter or Add Button */}
          {inCart ? (
            <View
              className="flex-row items-center rounded-full px-1 h-7.5"
              style={{ backgroundColor: activeColors.brand.primarySurface }}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity - 1);
                }}
                hitSlop={4}
                className="w-5.5 h-5.5 rounded-full items-center justify-center">
                <Text className="text-base font-extrabold leading-5" style={{ color: activeColors.brand.primary }}>
                  −
                </Text>
              </Pressable>
              <Text
                className="font-extrabold text-xs min-w-4 text-center"
                style={{ color: activeColors.brand.primary }}>
                {inCart.quantity}
              </Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity + 1);
                }}
                hitSlop={4}
                className="w-5.5 h-5.5 rounded-full items-center justify-center">
                <Text className="text-base font-extrabold leading-5" style={{ color: activeColors.brand.primary }}>
                  +
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleAdd}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: activeColors.brand.primary }}
              hitSlop={6}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.8} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  </View>
);
}
