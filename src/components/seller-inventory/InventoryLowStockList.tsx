import { PackagePlus, TrendingDown } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { tr } from '@/i18n';
import { LowStockVariant } from '@/lib/types';
import { colors } from '@/theme';

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
      <View className="p-8 items-center gap-2">
        <View className="w-16 h-16 rounded-full bg-brand-primary/10 items-center justify-center">
          <TrendingDown size={28} color={colors.feedback.warning} strokeWidth={1.8} />
        </View>
        <Text className="text-lg font-bold text-text-primary">{tr('inv.lowEmptyTitle')}</Text>
        <Text className="text-xs text-text-secondary text-center">{tr('inv.lowEmptyHint')}</Text>
      </View>
    );
  }

  const tiers: LowStockVariant['tier'][] = ['critical', 'warning'];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}>
      {tiers.map((tier) => {
        const items = data.filter((v) => v.tier === tier);
        if (!items.length) return null;
        const meta = LOW_STOCK_TIER_META[tier];
        return (
          <View key={tier} className="gap-2">
            <Text className="text-sm font-extrabold ml-1" style={{ color: meta.color }}>
              {meta.emoji} {lowStockTierLabel(tier)} ({items.length})
            </Text>
            {items.map((item) => (
              <View
                key={item.id}
                className="bg-bg-surface rounded-2xl border shadow-sm"
                style={{ borderColor: meta.color }}
              >
                <View className="flex-row items-center gap-3 p-3.5">
                  <View
                    className="w-13 h-13 rounded-xl items-center justify-center"
                    style={{ backgroundColor: meta.surface }}
                  >
                    <Text className="text-xl font-extrabold leading-6" style={{ color: meta.color }}>
                      {item.stock}
                    </Text>
                    <Text className="text-[11px] font-semibold" style={{ color: meta.color }}>
                      {tr('inv.pcs')}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-xs text-text-tertiary mt-0.5">
                      {tr('inv.thresholdLine', {
                        value: item.lowStockThreshold,
                        unit: unitLabel(item.unitType),
                      })}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2 px-3.5 pb-3.5">
                  <Pressable
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20 active:opacity-75"
                    onPress={() => onKirim(item)}
                  >
                    <PackagePlus size={14} color={colors.brand.primary} strokeWidth={2.2} />
                    <Text className="text-xs font-bold text-brand-primary">{tr('inv.doKirim')}</Text>
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
