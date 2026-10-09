import { PackagePlus, TrendingDown } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { tr } from '@/i18n';
import { LowStockVariant } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

import { unitLabel } from './types';

const LOW_STOCK_TIER_META: Record<
  LowStockVariant['tier'],
  { emoji: string; color: string; surface: string }
> = {
  critical: { emoji: '🟠', color: colors.feedback.danger, surface: colors.feedback.dangerSurface },
  warning: { emoji: '🟡', color: colors.feedback.warning, surface: colors.feedback.warningSurface },
};

function lowStockTierLabel(tier: LowStockVariant['tier']): string {
  return tier === 'critical' ? tr('inv.tierCritical') : tr('inv.tierLow');
}

interface InventoryLowStockListProps {
  data: LowStockVariant[];
  isLoading: boolean;
  onKirim: (v: LowStockVariant) => void;
}

export function InventoryLowStockList({
  data,
  isLoading,
  onKirim,
}: InventoryLowStockListProps) {
  if (isLoading) {
    return <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />;
  }

  if (!data.length) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <TrendingDown size={28} color={colors.feedback.warning} strokeWidth={1.8} />
        </View>
        <Text style={styles.emptyTitle}>{tr('inv.lowEmptyTitle')}</Text>
        <Text style={styles.dim}>{tr('inv.lowEmptyHint')}</Text>
      </View>
    );
  }

  const tiers: LowStockVariant['tier'][] = ['critical', 'warning'];

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {tiers.map((tier) => {
        const items = data.filter((v) => v.tier === tier);
        if (!items.length) return null;
        const meta = LOW_STOCK_TIER_META[tier];
        return (
          <View key={tier} style={styles.tierGroup}>
            <Text style={[styles.tierGroupTitle, { color: meta.color }]}>
              {meta.emoji} {lowStockTierLabel(tier)} ({items.length})
            </Text>
            {items.map((item) => (
              <View key={item.id} style={[styles.card, { borderColor: meta.color }]}>
                <View style={styles.cardMain}>
                  <View style={[styles.expiryDaysBox, { backgroundColor: meta.surface }]}>
                    <Text style={[styles.expiryDaysNum, { color: meta.color }]}>{item.stock}</Text>
                    <Text style={[styles.expiryDaysLabel, { color: meta.color }]}>{tr('inv.pcs')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.unit}>
                      {tr('inv.thresholdLine', {
                        value: item.lowStockThreshold,
                        unit: unitLabel(item.unitType),
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.tierActions}>
                  <Pressable style={styles.tierActionBtn} onPress={() => onKirim(item)}>
                    <PackagePlus size={14} color={colors.brand.primary} strokeWidth={2.2} />
                    <Text style={styles.tierActionBtnText}>{tr('inv.doKirim')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: layout.screenPadding,
    paddingBottom: 100,
    gap: spacing.md,
  },
  tierGroup: {
    gap: spacing.sm,
  },
  tierGroupTitle: {
    ...typography.bodyStrong,
    fontWeight: '800',
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  unit: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  expiryDaysBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryDaysNum: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  expiryDaysLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  tierActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  tierActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  tierActionBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  empty: {
    padding: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  dim: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
