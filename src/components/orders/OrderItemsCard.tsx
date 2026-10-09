import React from 'react';
import { Image, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { OrderItem } from '@/lib/types';
import { colors, typography } from '@/theme';
import { getLocalizedText } from '@/utils/text';

interface OrderItemsCardProps {
  items: OrderItem[];
  hasReturns: boolean;
}

export function OrderItemsCard({ items, hasReturns }: OrderItemsCardProps) {
  const { tr } = useTranslation();

  return (
    <View
      className="p-4 rounded-2xl border gap-3"
      style={{
        backgroundColor: colors.bg.surface,
        borderColor: colors.border.subtle,
      }}
    >
      <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
        {tr('shop.products')}
      </Text>
      {items.map((it) => {
        const photo = it.productVariant?.globalProduct?.photos?.[0];
        return (
          <View key={it.id} className="flex-row items-center gap-3">
            {photo ? (
              <Image
                source={{ uri: resolveMedia(photo) }}
                className="w-12 h-12 rounded-xl"
                style={{ backgroundColor: colors.bg.canvas }}
              />
            ) : (
              <View className="w-12 h-12 rounded-xl" style={{ backgroundColor: colors.bg.canvas }} />
            )}
            <View className="flex-1">
              <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>
                {getLocalizedText(it.productName)}
              </Text>
              <Text className="mt-0.5" style={[typography.caption, { color: colors.text.secondary }]}>
                {it.quantity} × {it.unitPrice.toLocaleString()} {tr('common.som')}
              </Text>
              {hasReturns && it.returnedQuantity > 0 && (
                <Text className="mt-0.5" style={[typography.caption, { color: colors.feedback.warning }]}>
                  {tr('orderDet.returnedCount', { n: it.returnedQuantity })}
                </Text>
              )}
            </View>
            <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>
              {it.lineTotal.toLocaleString()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
