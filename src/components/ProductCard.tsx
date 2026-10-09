import { Minus, Plus, ShoppingBag, Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { useTranslation } from '@/i18n';
import { trackAddToCart } from '@/lib/analyticsQueue';
import { resolveMedia } from '@/lib/api';
import { FeedProduct } from '@/lib/types';
import { useCartStore } from '@/stores/cart';
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
 * Modern Uniform Two-column Grid Product Card.
 *
 * Designed with strictly uniform card & image heights, zero-lag cart updates,
 * high-contrast light/dark mode buttons, and no intrusive alert popups.
 */
export function ProductCard({
  product,
  onPress,
  cardWidth,
  hideShopChip,
}: Props) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const updateQty = useCartStore((s) => s.updateQty);

  // Primitive selector: ONLY re-renders this exact card when its quantity changes
  const quantity = useCartStore((s) => {
    const shopLines = s.carts[product.shopId];
    if (!shopLines) return 0;
    const line = shopLines.find((l) => l.variantId === product.id);
    return line?.quantity ?? 0;
  });
  const inCart = quantity > 0;

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
  };

  const formattedDistance =
    product.shop?.distanceKm !== undefined && product.shop?.distanceKm !== null
      ? product.shop.distanceKm < 1
        ? `${Math.round(product.shop.distanceKm * 1000)}m`
        : `${product.shop.distanceKm.toFixed(1)} km`
      : null;

  const imageSize = cardWidth ?? 170;

  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.duration(280)}
      style={cardWidth ? { width: cardWidth } : { flex: 1, maxWidth: '48.8%' }}>
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
        {/* Uniform Product Image Area */}
        <View
          style={{
            width: '100%',
            height: imageSize,
            backgroundColor: activeColors.bg.surfaceMuted,
          }}
          className="relative overflow-hidden">
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
              <Text className="text-white font-extrabold text-[10px]">−{discountPct}%</Text>
            </View>
          )}

          {product.unitSize ? (
            <View
              className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}>
              <Text className="text-white font-bold text-[9.5px]">
                {product.unitSize} {product.unitType || ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Card Details Body with Guaranteed Fixed Slot Heights */}
        <View className="p-2.5">
          {/* Product Name (exact 36px slot for 2 lines) */}
          <View className="h-9 justify-center">
            <Text
              className="text-[13px] leading-[18px] font-bold"
              style={{ color: activeColors.text.primary }}
              numberOfLines={2}>
              {productName}
            </Text>
          </View>

          {/* Shop Name & Distance (exact 18px slot) */}
          <View className="h-[18px] justify-center mt-0.5">
            {!hideShopChip && product.shop ? (
              <View className="flex-row items-center gap-1">
                <Store size={11} color={activeColors.text.tertiary} strokeWidth={2.2} />
                <Text
                  className="text-[11px] font-semibold flex-shrink"
                  style={{ color: activeColors.text.secondary }}
                  numberOfLines={1}>
                  {product.shop.name}
                </Text>
                {formattedDistance && (
                  <>
                    <Text className="text-[10px]" style={{ color: activeColors.text.tertiary }}>
                      ·
                    </Text>
                    <Text
                      className="text-[10.5px] font-semibold"
                      style={{ color: activeColors.text.tertiary }}>
                      {formattedDistance}
                    </Text>
                  </>
                )}
              </View>
            ) : null}
          </View>

          {/* Price & Action Row (exact 34px slot) */}
          <View className="h-[34px] flex-row items-center justify-between mt-1.5">
            <View className="flex-1 mr-1 justify-center">
              {hasDiscount && (
                <Text
                  className="text-[10px] line-through leading-3"
                  style={{ color: activeColors.text.hint }}
                  numberOfLines={1}>
                  {formatMoney(product.price)}
                </Text>
              )}
              <Text
                className="text-[13px] font-extrabold leading-[17px]"
                style={{ color: activeColors.text.primary }}
                numberOfLines={1}>
                {formatMoney(finalPrice)}{' '}
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: activeColors.text.secondary }}>
                  {tr('common.som')}
                </Text>
              </Text>
            </View>

            {/* Quick Counter or Add Button */}
            {inCart ? (
              <View
                className="flex-row items-center rounded-full px-1 h-7.5 shadow-sm"
                style={{ backgroundColor: activeColors.brand.primary }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    haptics.light();
                    updateQty(product.shopId, product.id, quantity - 1);
                  }}
                  hitSlop={6}
                  className="w-5.5 h-5.5 rounded-full items-center justify-center active:opacity-70">
                  <Minus size={13} color="#FFFFFF" strokeWidth={3} />
                </Pressable>
                <Text className="font-extrabold text-xs min-w-[16px] text-center text-white">
                  {quantity}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    haptics.light();
                    updateQty(product.shopId, product.id, quantity + 1);
                  }}
                  hitSlop={6}
                  className="w-5.5 h-5.5 rounded-full items-center justify-center active:opacity-70">
                  <Plus size={13} color="#FFFFFF" strokeWidth={3} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleAdd}
                className="w-7.5 h-7.5 rounded-full items-center justify-center shadow-sm active:scale-95"
                style={{ backgroundColor: activeColors.brand.primary }}
                hitSlop={6}>
                <Plus size={16} color="#FFFFFF" strokeWidth={2.8} />
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
