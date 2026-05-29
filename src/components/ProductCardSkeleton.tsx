import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, shadow, spacing } from '@/theme';

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
    <View style={[styles.card, cardWidth ? { width: cardWidth } : null]}>
      <View style={styles.imageWrap}>
        <Skeleton style={styles.imageFill} radius={0} />
      </View>
      <View style={styles.body}>
        {/* name — two lines (matches ProductCard name minHeight) */}
        <Skeleton width="100%" height={13} />
        <Skeleton width="60%" height={13} />
        {/* shop chip line */}
        <Skeleton width="55%" height={11} style={styles.shopLine} />
        {/* price row + round add button */}
        <View style={styles.priceRow}>
          <Skeleton width={62} height={16} />
          <Skeleton width={32} height={32} radius={radius.full} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    ...shadow.xs,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bg.surfaceMuted,
  },
  imageFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  body: { padding: spacing.md, gap: spacing.xs },
  shopLine: { marginTop: 2 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
