import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { OrderItem, ProductOffer } from '@/lib/types';
import { colors, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

interface OrderAlternativesCardProps {
  items: OrderItem[];
  offersByItem: ProductOffer[][];
  hasNoOffers: boolean;
  onSelectProduct: (variantId: string) => void;
}

export function OrderAlternativesCard({
  items,
  offersByItem,
  hasNoOffers,
  onSelectProduct,
}: OrderAlternativesCardProps) {
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
        {tr('orders.findElsewhereTitle')}
      </Text>
      {items.map((it, idx) => {
        const offers = (offersByItem[idx] ?? []).slice(0, 5);
        if (offers.length === 0) return null;
        return (
          <View key={it.id} className="gap-1">
            <Text className="text-[13px] font-bold" style={{ color: colors.text.secondary }}>
              {getLocalizedText(it.productName)}
            </Text>
            {offers.map((o) => (
              <Pressable
                key={o.variantId}
                className="flex-row items-center justify-between py-2 border-b"
                style={{ borderBottomColor: colors.border.subtle }}
                onPress={() => {
                  haptics.selection();
                  onSelectProduct(o.variantId);
                }}>
                <View className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: colors.text.primary }} numberOfLines={1}>
                    {o.shopName}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.text.tertiary }}>
                    {o.isOpen ? tr('shop.open') : tr('shop.closed')}
                    {o.distanceKm != null
                      ? ` · ${o.distanceKm < 1 ? `${Math.round(o.distanceKm * 1000)} m` : `${o.distanceKm.toFixed(1)} km`}`
                      : ''}
                  </Text>
                </View>
                <Text className="text-sm font-bold" style={{ color: colors.brand.primary }}>
                  {(o.discountPrice ?? o.price).toLocaleString()} {tr('common.som')}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      {hasNoOffers && (
        <Text className="italic" style={[typography.bodySmall, { color: colors.text.tertiary }]}>
          {tr('orders.findElsewhereEmpty')}
        </Text>
      )}
    </View>
  );
}
