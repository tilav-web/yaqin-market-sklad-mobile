import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/theme';

export function ShopCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={160} radius={0} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Skeleton width="60%" height={20} />
          <Skeleton width={64} height={20} radius={radius.full} />
        </View>
        <Skeleton width="80%" height={14} />
        <View style={styles.metaRow}>
          <Skeleton width={100} height={14} />
          <Skeleton width={80} height={14} />
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
  },
  body: { padding: spacing.lg, gap: spacing.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
});
