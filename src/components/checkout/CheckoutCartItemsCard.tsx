import { Minus, Plus, Store, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { CartLine, PublicShop } from '@/lib/types';
import { colors, shadow, typography } from '@/theme';
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
    <View
      className="p-4 rounded-2xl border"
      style={[{ backgroundColor: colors.bg.surface, borderColor: colors.border.subtle }, shadow.xs]}
    >
      <View className="flex-row items-center gap-2">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.brand.primarySurface }}
        >
          <Store size={16} color={colors.brand.primary} strokeWidth={2.4} />
        </View>
        <View className="flex-1">
          <Text style={[typography.h4, { color: colors.text.primary }]} numberOfLines={1}>
            {shop?.name ?? tr('checkout.itemsTitle')}
          </Text>
          <Text style={[typography.caption, { color: colors.text.tertiary }]}>
            {tr('cart.itemsCount', { n: cartLines.length })}
          </Text>
        </View>
      </View>

      {cartLines.map((line, i) => (
        <View
          key={line.variantId}
          className={`flex-row gap-3 py-3 items-center ${i > 0 ? 'border-t' : ''}`}
          style={i > 0 ? { borderTopColor: colors.border.subtle } : undefined}
        >
          <View
            className="w-13 h-13 rounded-xl overflow-hidden"
            style={{ backgroundColor: colors.bg.surfaceMuted }}
          >
            {line.photoUrl ? (
              <Image source={{ uri: resolveMedia(line.photoUrl) }} className="w-full h-full" />
            ) : (
              <View
                className="w-full h-full"
                style={{ backgroundColor: colors.brand.primarySurface }}
              />
            )}
          </View>
          <View className="flex-1">
            <Text
              className="font-semibold"
              style={[typography.bodySmall, { color: colors.text.primary }]}
              numberOfLines={2}
            >
              {line.productName}
            </Text>
            <Text className="mt-0.5" style={typography.priceSmall}>
              {(line.unitPrice * line.quantity).toLocaleString()} {tr('common.som')}
            </Text>
          </View>
          <View
            className="flex-row items-center gap-1 rounded-full px-1"
            style={{ backgroundColor: colors.brand.primarySurface }}
          >
            <Pressable
              className="w-8 h-8 items-center justify-center"
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
            <Text
              className="min-w-[20px] text-center"
              style={[typography.bodyStrong, { color: colors.brand.primary }]}
            >
              {line.quantity}
            </Text>
            <Pressable
              className="w-8 h-8 items-center justify-center"
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

      <View className="h-px mt-2 mb-3" style={{ backgroundColor: colors.border.subtle }} />
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
    <View className="flex-row justify-between items-center py-1">
      <Text style={[typography.body, { color: colors.text.secondary }]}>{label}</Text>
      <Text
        style={[
          typography.body,
          {
            fontWeight: free ? '700' : '600',
            color: free ? colors.feedback.success : undefined,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
