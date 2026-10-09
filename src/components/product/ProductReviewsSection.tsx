import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ProductReview } from '@/lib/types';
import { spacing, typography } from '@/theme';

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
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: activeColors.text.primary }]}>
        {tr('product.reviews')} {reviews?.length ? `(${reviews.length})` : ''}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={activeColors.brand.primary} />
      ) : reviews && reviews.length > 0 ? (
        reviews.map((r) => (
          <View
            key={r.id}
            style={[
              styles.review,
              { borderTopColor: activeColors.border.subtle },
            ]}
          >
            <View style={styles.reviewHead}>
              <Text style={[styles.reviewName, { color: activeColors.text.primary }]}>
                {r.userName}
              </Text>
              <Stars value={r.stars} size={12} />
            </View>
            {r.text ? (
              <Text style={[styles.reviewText, { color: activeColors.text.secondary }]}>
                {r.text}
              </Text>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={[styles.reviewEmpty, { color: activeColors.text.tertiary }]}>
          {tr('product.noReviews')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
  },
  review: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewName: {
    ...typography.bodyStrong,
    fontSize: 13,
  },
  reviewText: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  reviewEmpty: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
