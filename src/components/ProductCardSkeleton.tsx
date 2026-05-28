import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme';

interface Props {
  readonly cardWidth?: number;
}

export function ProductCardSkeleton({ cardWidth }: Props) {
  return (
    <View style={[styles.card, cardWidth ? { width: cardWidth } : null]}>
      <Skeleton width="100%" height={120} radius={0} />
      <View style={styles.body}>
        <Skeleton width="90%" height={14} />
        <Skeleton width="60%" height={12} />
        <View style={styles.priceRow}>
          <Skeleton width={60} height={16} />
          <Skeleton width={32} height={32} radius={16} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  body: { padding: spacing.md, gap: spacing.xs },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
