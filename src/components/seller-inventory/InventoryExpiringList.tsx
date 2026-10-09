import { AlertTriangle, Ban, Percent } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { tr } from '@/i18n';
import { ExpiringVariant } from '@/lib/types';
import { colors } from '@/theme';

import { unitLabel } from './types';

const EXPIRY_TIER_META: Record<
  ExpiringVariant['tier'],
  { emoji: string; color: string; surface: string }
> = {
  expired: { emoji: '🔴', color: colors.feedback.danger, surface: colors.feedback.dangerSurface },
  critical: { emoji: '🟠', color: colors.feedback.warning, surface: colors.feedback.warningSurface },
  warning: { emoji: '🟡', color: colors.feedback.warning, surface: colors.feedback.warningSurface },
};

function expiryTierLabel(tier: ExpiringVariant['tier']): string {
  if (tier === 'expired') return tr('inv.tierExpired');
  if (tier === 'critical') return tr('inv.tierCritical');
  return tr('inv.tierWarning');
}

interface InventoryExpiringListProps {
  data: ExpiringVariant[];
  isLoading: boolean;
  onBrak: (v: ExpiringVariant) => void;
  onDiscount: (v: ExpiringVariant) => void;
}

export function InventoryExpiringList({
  data,
  isLoading,
  onBrak,
  onDiscount,
}: InventoryExpiringListProps) {
  if (isLoading) {
    return <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />;
  }

  if (!data.length) {
    return (
      <View className="p-8 items-center gap-2">
        <View className="w-16 h-16 rounded-full bg-brand-primary/10 items-center justify-center">
          <AlertTriangle size={28} color={colors.feedback.warning} strokeWidth={1.8} />
        </View>
        <Text className="text-lg font-bold text-text-primary">{tr('inv.expiringEmptyTitle')}</Text>
        <Text className="text-xs text-text-secondary text-center">{tr('inv.expiringEmptyHint')}</Text>
      </View>
    );
  }

  const tiers: ExpiringVariant['tier'][] = ['expired', 'critical', 'warning'];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}>
      {tiers.map((tier) => {
        const items = data.filter((v) => v.tier === tier);
        if (!items.length) return null;
        const meta = EXPIRY_TIER_META[tier];
        return (
          <View key={tier} className="gap-2">
            <Text className="text-sm font-extrabold ml-1" style={{ color: meta.color }}>
              {meta.emoji} {expiryTierLabel(tier)} ({items.length})
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
                      {Math.max(item.daysToExpiry, 0)}
                    </Text>
                    <Text className="text-[11px] font-semibold" style={{ color: meta.color }}>
                      {tr('inv.days')}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-xs text-text-tertiary mt-0.5">
                      {tr('inv.expiryLine', {
                        stock: item.stock,
                        unit: unitLabel(item.unitType),
                        date: new Date(item.expiryDate).toLocaleDateString('uz-UZ'),
                      })}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2 px-3.5 pb-3.5">
                  <Pressable
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-feedback-danger/10 border border-feedback-danger active:opacity-75"
                    onPress={() => onBrak(item)}
                  >
                    <Ban size={14} color={colors.feedback.danger} strokeWidth={2.2} />
                    <Text className="text-xs font-bold text-feedback-danger">{tr('inv.brak')}</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20 active:opacity-75"
                    onPress={() => onDiscount(item)}
                  >
                    <Percent size={14} color={colors.brand.primary} strokeWidth={2.2} />
                    <Text className="text-xs font-bold text-brand-primary">{tr('inv.setDiscount')}</Text>
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
