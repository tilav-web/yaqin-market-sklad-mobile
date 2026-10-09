import React from 'react';
import { View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/stores/theme';
import { shadow } from '@/theme';

interface ProductCardSkeletonProps {
  cardWidth?: number;
}

export function ProductCardSkeleton({ cardWidth }: ProductCardSkeletonProps) {
  const { colors: activeColors } = useTheme();
  const imageSize = cardWidth ?? 170;

  return (
    <View
      style={[
        cardWidth ? { width: cardWidth } : { flex: 1, maxWidth: '48.8%' },
        shadow.sm,
      ]}
      className="rounded-2xl border overflow-hidden"
    >
      <View
        className="w-full rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: activeColors.bg.surface,
          borderColor: activeColors.border.subtle,
        }}
      >
        {/* Image Placeholder Skeleton */}
        <Skeleton
          width="100%"
          height={imageSize}
          radius={0}
          style={{ backgroundColor: activeColors.bg.surfaceMuted }}
        />

        {/* Details Skeleton */}
        <View className="p-2.5">
          {/* Title 2-lines Skeleton */}
          <View className="h-9 justify-center gap-1.5">
            <Skeleton width="92%" height={12} radius={4} />
            <Skeleton width="58%" height={12} radius={4} />
          </View>

          {/* Shop / distance chip Skeleton */}
          <View className="h-[18px] justify-center mt-0.5">
            <Skeleton width="45%" height={10} radius={4} />
          </View>

          {/* Price & Action Button Row Skeleton */}
          <View className="h-[34px] flex-row items-center justify-between mt-1.5">
            <Skeleton width="55%" height={16} radius={5} />
            <Skeleton width={32} height={32} radius={16} />
          </View>
        </View>
      </View>
    </View>
  );
}
