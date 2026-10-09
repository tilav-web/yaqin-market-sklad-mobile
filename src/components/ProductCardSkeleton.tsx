import { View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, shadow } from '@/theme';

interface Props {
  readonly cardWidth?: number;
}

/**
 * Loading placeholder that mirrors ProductCard's layout exactly: a square
 * image, a two-line name, a shop line, then a price row with a round CTA — so
 * the transition from skeleton to content has no layout shift.
 */
export function ProductCardSkeleton({ cardWidth }: Props) {
  return (
    <View
      className="rounded-2xl border overflow-hidden"
      style={[
        {
          backgroundColor: colors.bg.surface,
          borderColor: colors.border.subtle,
        },
        shadow.xs,
        cardWidth ? { width: cardWidth } : null,
      ]}
    >
      <View
        className="w-full aspect-square relative"
        style={{ backgroundColor: colors.bg.surfaceMuted }}
      >
        <Skeleton className="absolute inset-0" radius={0} />
      </View>
      <View className="p-3 gap-1">
        {/* name — two lines (matches ProductCard name minHeight) */}
        <Skeleton width="100%" height={13} />
        <Skeleton width="60%" height={13} />
        {/* shop chip line */}
        <Skeleton width="55%" height={11} className="mt-0.5" />
        {/* price row + round add button */}
        <View className="flex-row justify-between items-center mt-1">
          <Skeleton width={62} height={16} />
          <Skeleton width={32} height={32} radius={999} />
        </View>
      </View>
    </View>
  );
}
