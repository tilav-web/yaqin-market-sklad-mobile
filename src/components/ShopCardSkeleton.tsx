import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, shadow, spacing } from '@/theme';

/** Loading placeholder mirroring ShopCard (160px hero, title + distance chip, desc, meta row). */
export function ShopCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={160} radius={0} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Skeleton width="55%" height={18} />
          <Skeleton width={64} height={22} radius={radius.full} />
        </View>
        <Skeleton width="80%" height={13} />
        <View style={styles.metaRow}>
          <Skeleton width={104} height={14} />
          <Skeleton width={84} height={14} />
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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  body: { padding: spacing.lg, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
});
