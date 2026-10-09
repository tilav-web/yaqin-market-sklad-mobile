import React from 'react';
import { View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';

interface ProductCardSkeletonProps {
  cardWidth?: number;
}

export function ProductCardSkeleton({ cardWidth }: ProductCardSkeletonProps) {
  const imageSize = cardWidth ?? 170;

  return (
    <View
      style={cardWidth ? { width: cardWidth } : { flex: 1, maxWidth: '48.8%' }}
      className="my-1 rounded-2xl bg-bg-surface border border-border-subtle shadow-md overflow-hidden"
    >
      {/* Image Placeholder Skeleton */}
      <Skeleton
        width="100%"
        height={imageSize}
        radius={0}
      />

      {/* Details Skeleton */}
      <View className="p-2.5">
        <View className="gap-1.5">
          <Skeleton width="92%" height={12} radius={4} />
          <Skeleton width="58%" height={12} radius={4} />
          <Skeleton width="45%" height={10} radius={4} style={{ marginTop: 2 }} />
        </View>

        {/* Single Row: Price & Action Button Skeleton */}
        <View className="flex-row items-center justify-between mt-2">
          <Skeleton width="55%" height={16} radius={5} />
          <Skeleton width={28} height={28} radius={14} />
        </View>
      </View>
    </View>
  );
}
