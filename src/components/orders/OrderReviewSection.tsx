import { Star } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { OrderItem } from '@/lib/types';
import { colors, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

interface OrderReviewSectionProps {
  unreviewedItems: OrderItem[];
  allReviewed: boolean;
  hasDeliveredCourier: boolean;
  courierReviewed: boolean;
  shopReviewed: boolean;
  onSubmitProductReviews: (reviews: { productVariantId: string; stars: number; text?: string }[]) => Promise<void>;
  onSubmitCourierRating: (stars: number) => Promise<void>;
  onSubmitShopRating: (stars: number) => Promise<void>;
}

export function StarPicker({
  value,
  onChange,
}: {
  readonly value: number;
  readonly onChange: (v: number) => void;
}) {
  return (
    <View className="flex-row gap-1.5 my-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={4}>
          <Star
            size={28}
            color={i <= value ? colors.feedback.warning : colors.border.default}
            fill={i <= value ? colors.feedback.warning : 'transparent'}
            strokeWidth={2}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function OrderReviewSection({
  unreviewedItems,
  allReviewed,
  hasDeliveredCourier,
  courierReviewed,
  shopReviewed,
  onSubmitProductReviews,
  onSubmitCourierRating,
  onSubmitShopRating,
}: OrderReviewSectionProps) {
  const { tr } = useTranslation();
  const [ratingDraft, setRatingDraft] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState<Record<string, string>>({});
  const [productLoading, setProductLoading] = useState(false);

  const [courierStars, setCourierStars] = useState(0);
  const [courierLoading, setCourierLoading] = useState(false);

  const [shopStars, setShopStars] = useState(0);
  const [shopLoading, setShopLoading] = useState(false);

  const pendingRatings = Object.values(ratingDraft).filter((s) => s > 0).length;

  const handleProductSubmit = async () => {
    const items = Object.entries(ratingDraft)
      .filter(([, stars]) => stars > 0)
      .map(([productVariantId, stars]) => ({
        productVariantId,
        stars,
        text: reviewText[productVariantId]?.trim() || undefined,
      }));
    if (items.length === 0) return;
    setProductLoading(true);
    try {
      await onSubmitProductReviews(items);
      setRatingDraft({});
      setReviewText({});
    } finally {
      setProductLoading(false);
    }
  };

  const handleCourierSubmit = async () => {
    if (courierStars <= 0) return;
    setCourierLoading(true);
    try {
      await onSubmitCourierRating(courierStars);
      setCourierStars(0);
    } finally {
      setCourierLoading(false);
    }
  };

  const handleShopSubmit = async () => {
    if (shopStars <= 0) return;
    setShopLoading(true);
    try {
      await onSubmitShopRating(shopStars);
      setShopStars(0);
    } finally {
      setShopLoading(false);
    }
  };

  return (
    <>
      {/* Products review */}
      {unreviewedItems.length > 0 && (
        <View
          className="p-4 rounded-2xl border gap-3"
          style={{
            backgroundColor: colors.bg.surface,
            borderColor: colors.border.subtle,
          }}
        >
          <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
            {tr('orderDet.rateProducts')}
          </Text>
          {unreviewedItems.map((it) => (
            <View key={it.id} className="gap-1.5 pb-2">
              <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>
                {getLocalizedText(it.productName)}
              </Text>
              <StarPicker
                value={ratingDraft[it.productVariantId] ?? 0}
                onChange={(v) => {
                  haptics.selection();
                  setRatingDraft((d) => ({ ...d, [it.productVariantId]: v }));
                }}
              />
              {(ratingDraft[it.productVariantId] ?? 0) > 0 && (
                <TextInput
                  className="border rounded-xl p-3 mt-1"
                  style={[
                    typography.body,
                    {
                      borderColor: colors.border.default,
                      backgroundColor: colors.bg.canvas,
                    },
                  ]}
                  placeholder={tr('orderDet.reviewPlaceholder')}
                  placeholderTextColor={colors.text.hint}
                  value={reviewText[it.productVariantId] ?? ''}
                  onChangeText={(t) =>
                    setReviewText((r) => ({ ...r, [it.productVariantId]: t }))
                  }
                />
              )}
            </View>
          ))}
          {pendingRatings > 0 && (
            <Pressable
              className="h-12 rounded-2xl items-center justify-center mt-1"
              style={{ backgroundColor: colors.brand.primary }}
              onPress={handleProductSubmit}
              disabled={productLoading}>
              {productLoading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={[typography.button, { color: colors.text.onPrimary }]}>
                  {tr('orderDet.submitReviews', { n: pendingRatings })}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {allReviewed && (
        <Text className="text-center" style={[typography.caption, { color: colors.text.tertiary }]}>
          {tr('orderDet.allReviewed')}
        </Text>
      )}

      {/* Courier review */}
      {hasDeliveredCourier && !courierReviewed && (
        <View
          className="p-4 rounded-2xl border gap-3"
          style={{
            backgroundColor: colors.bg.surface,
            borderColor: colors.border.subtle,
          }}
        >
          <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
            {tr('orderDet.rateCourier')}
          </Text>
          <StarPicker
            value={courierStars}
            onChange={(v) => {
              haptics.selection();
              setCourierStars(v);
            }}
          />
          {courierStars > 0 && (
            <Pressable
              className="h-12 rounded-2xl items-center justify-center mt-1"
              style={{ backgroundColor: colors.brand.primary }}
              onPress={handleCourierSubmit}
              disabled={courierLoading}>
              {courierLoading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={[typography.button, { color: colors.text.onPrimary }]}>
                  {tr('orderDet.submitRating')}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Shop review */}
      {!shopReviewed && (
        <View
          className="p-4 rounded-2xl border gap-3"
          style={{
            backgroundColor: colors.bg.surface,
            borderColor: colors.border.subtle,
          }}
        >
          <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
            {tr('orderDet.rateShop')}
          </Text>
          <StarPicker
            value={shopStars}
            onChange={(v) => {
              haptics.selection();
              setShopStars(v);
            }}
          />
          {shopStars > 0 && (
            <Pressable
              className="h-12 rounded-2xl items-center justify-center mt-1"
              style={{ backgroundColor: colors.brand.primary }}
              onPress={handleShopSubmit}
              disabled={shopLoading}>
              {shopLoading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={[typography.button, { color: colors.text.onPrimary }]}>
                  {tr('orderDet.submitRating')}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      )}
    </>
  );
}
