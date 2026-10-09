import { type Href, router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ShopCompleteness, ShopCompletenessItem } from '@/lib/types';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

function completenessTarget(key: string, shopId: string): Href {
  switch (key) {
    case 'delivery_zone':
      return `/seller/${shopId}/delivery-zones` as Href;
    case 'products_10':
    case 'products_50':
    case 'products_100':
    case 'product_photos':
      return `/seller/${shopId}/inventory` as Href;
    default:
      return `/seller/${shopId}/shop-settings` as Href;
  }
}

interface ShopCompletenessCardProps {
  completeness: ShopCompleteness;
  shopId: string;
}

export function ShopCompletenessCard({ completeness, shopId }: ShopCompletenessCardProps) {
  const { tr } = useTranslation();
  if (completeness.score >= 100) return null;

  const isGoodScore = completeness.score >= 70;

  return (
    <View className="bg-surface rounded-2xl p-4 gap-2.5 border border-border-subtle shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-text-primary">{tr('shopSettings.completeness')}</Text>
        <Text
          className={`text-base font-extrabold ${
            isGoodScore ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          {completeness.score} / 100
        </Text>
      </View>

      <View className="h-2 bg-surface-muted rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${isGoodScore ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${completeness.score}%` as `${number}%` }}
        />
      </View>

      <View className="mt-1 gap-1">
        {completeness.items.map((item) => (
          <CompletenessRow key={item.key} item={item} shopId={shopId} />
        ))}
      </View>
    </View>
  );
}

function CompletenessRow({ item, shopId }: { item: ShopCompletenessItem; shopId: string }) {
  if (item.done) {
    return (
      <View className="flex-row items-center gap-2.5 py-1">
        <View className="w-5 h-5 rounded-full items-center justify-center bg-emerald-100">
          <Check size={12} color={colors.feedback.success} strokeWidth={3} />
        </View>
        <Text className="text-xs text-text-tertiary flex-1 line-through" numberOfLines={1}>
          {item.label}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        router.push(completenessTarget(item.key, shopId));
      }}
      className="flex-row items-center gap-2.5 py-1 active:opacity-60"
    >
      <View className="w-5 h-5 rounded-full items-center justify-center bg-surface-muted">
        <Text className="text-[11px] font-extrabold text-text-tertiary">✕</Text>
      </View>
      <Text className="text-xs text-text-primary font-semibold flex-1" numberOfLines={1}>
        {item.label}
      </Text>
      <Text className="text-xs font-bold text-amber-600">+{item.points} ball</Text>
      <ChevronRight size={14} color={colors.text.tertiary} strokeWidth={2.2} />
    </Pressable>
  );
}
