import React from 'react';
import { View } from 'react-native';

import { ProductCardSkeleton } from './ProductCardSkeleton';

interface ProductGridSkeletonProps {
  cardWidth: number;
  count?: number;
}

export function ProductGridSkeleton({ cardWidth, count = 6 }: ProductGridSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 14,
        gap: 10,
      }}
    >
      {items.map((key) => (
        <ProductCardSkeleton key={`skeleton-card-${key}`} cardWidth={cardWidth} />
      ))}
    </View>
  );
}
