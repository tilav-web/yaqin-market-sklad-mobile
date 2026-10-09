import { Truck } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

import { Filter, FILTERS } from './types';

interface SellerOrderFilterSegmentsProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: Record<Filter, number>;
  canSeeRoute: boolean;
  deliveringCount: number;
  onOpenRoute: () => void;
}

export function SellerOrderFilterSegments({
  filter,
  onFilterChange,
  counts,
  canSeeRoute,
  deliveringCount,
  onOpenRoute,
}: SellerOrderFilterSegmentsProps) {
  const { tr } = useTranslation();

  return (
    <View className="flex-row gap-2 px-4 py-2 items-center">
      {FILTERS.map((f) => {
        const cnt = counts[f.key];
        const isActive = filter === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onFilterChange(f.key)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-full border ${
              isActive
                ? 'bg-brand-primary border-brand-primary'
                : 'bg-bg-surface border-border-default'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isActive ? 'text-text-on-primary' : 'text-text-secondary'
              }`}
            >
              {tr(f.labelKey)}
            </Text>
            {cnt > 0 && (
              <View
                className={`min-w-[18px] h-[18px] rounded-full px-1 items-center justify-center ${
                  isActive
                    ? 'bg-white/30'
                    : f.key === 'new'
                      ? 'bg-feedback-danger'
                      : 'bg-bg-surface-muted border border-border-default'
                }`}
              >
                <Text
                  className={`text-[10px] font-extrabold leading-[13px] ${
                    isActive || f.key === 'new' ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {cnt}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {canSeeRoute && (
        <Pressable
          className="relative w-9 h-9 rounded-full border border-brand-primary/20 bg-brand-primary/10 items-center justify-center active:opacity-75"
          onPress={onOpenRoute}
        >
          <Truck size={15} color={colors.brand.primary} strokeWidth={2.4} />
          <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-feedback-danger items-center justify-center border-[1.5px] border-bg-canvas">
            <Text className="text-[9px] text-white font-extrabold">{deliveringCount}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
