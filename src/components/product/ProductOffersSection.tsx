import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ProductOffer } from '@/lib/types';
import { colors, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface ProductOffersSectionProps {
  offers: ProductOffer[];
  currentVariantId: string;
  currentPrice: number;
  isLoading: boolean;
}

export function ProductOffersSection({
  offers,
  currentVariantId,
  currentPrice,
  isLoading,
}: ProductOffersSectionProps) {
  const { tr } = useTranslation();
  const others = offers.filter((o) => o.variantId !== currentVariantId);
  if (isLoading || others.length === 0) return null;

  const cheapestPrice = Math.min(...offers.map((o) => o.discountPrice ?? o.price));
  const SHOW = 5;
  const visible = others.slice(0, SHOW);

  return (
    <View className="mt-6 gap-2">
      <Text style={[typography.h4, { color: colors.text.primary }]}>
        {tr('prodDet.otherShops')}
      </Text>
      {visible.map((o, idx) => {
        const effectivePrice = o.discountPrice ?? o.price;
        const isCheapest = effectivePrice === cheapestPrice && idx === 0;
        const saving = currentPrice - effectivePrice;
        return (
          <Pressable
            key={o.variantId}
            className="flex-row items-center justify-between py-2 border-b"
            style={{ borderBottomColor: colors.border.subtle }}
            onPress={() => {
              haptics.selection();
              router.push(`/product/${o.variantId}`);
            }}
          >
            <View className="flex-1 mr-3">
              <Text className="font-bold" style={[typography.bodyStrong, { color: colors.text.primary }]} numberOfLines={1}>
                {o.shopName}
              </Text>
              <Text className="mt-0.5" style={[typography.caption, { color: colors.text.secondary }]}>
                {o.isOpen ? tr('shop.open') : tr('shop.closed')}
                {o.distanceKm != null
                  ? ` · ${
                      o.distanceKm < 1
                        ? `${Math.round(o.distanceKm * 1000)} m`
                        : `${o.distanceKm.toFixed(1)} km`
                    }`
                  : ''}
              </Text>
            </View>
            <View className="items-end gap-0.5">
              {isCheapest && (
                <View className="bg-emerald-100 px-1.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-extrabold text-emerald-700">
                    {tr('prodDet.cheapest')}
                  </Text>
                </View>
              )}
              {saving > 0 && (
                <Text className="text-[11px] font-bold" style={{ color: colors.feedback.success }}>
                  −{saving.toLocaleString()} {tr('common.som')}
                </Text>
              )}
              <Text
                style={[
                  typography.bodyStrong,
                  { color: isCheapest ? colors.brand.primary : colors.text.primary },
                ]}
              >
                {effectivePrice.toLocaleString()}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {others.length > SHOW && (
        <Text className="text-center mt-1" style={[typography.caption, { color: colors.text.hint }]}>
          {tr('prodDet.moreShops', { n: others.length - SHOW })}
        </Text>
      )}
    </View>
  );
}
