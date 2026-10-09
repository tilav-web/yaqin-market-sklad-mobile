import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ProductReview } from '@/lib/types';
import { typography } from '@/theme';

import { Stars } from './Stars';

interface ProductReviewsSectionProps {
  reviews?: ProductReview[];
  isLoading: boolean;
  activeColors: {
    brand: { primary: string };
    border: { subtle: string };
    text: { primary: string; secondary: string; tertiary: string };
  };
}

export function ProductReviewsSection({
  reviews,
  isLoading,
  activeColors,
}: ProductReviewsSectionProps) {
  const { tr } = useTranslation();

  return (
    <View className="mt-6 gap-2">
      <Text style={[typography.h4, { color: activeColors.text.primary }]}>
        {tr('product.reviews')} {reviews?.length ? `(${reviews.length})` : ''}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={activeColors.brand.primary} />
      ) : reviews && reviews.length > 0 ? (
        reviews.map((r) => (
          <View
            key={r.id}
            className="py-2 border-t gap-1"
            style={{ borderTopColor: activeColors.border.subtle }}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-xs font-bold" style={{ color: activeColors.text.primary }}>
                {r.userName}
              </Text>
              <Stars value={r.stars} size={12} />
            </View>
            {r.text ? (
              <Text className="leading-[18px]" style={[typography.bodySmall, { color: activeColors.text.secondary }]}>
                {r.text}
              </Text>
            ) : null}
          </View>
        ))
      ) : (
        <Text className="text-center py-3" style={[typography.caption, { color: activeColors.text.tertiary }]}>
          {tr('product.noReviews')}
        </Text>
      )}
    </View>
  );
}
