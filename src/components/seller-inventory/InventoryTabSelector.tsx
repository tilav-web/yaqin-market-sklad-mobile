import { AlertTriangle, Package, TrendingDown } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { colors } from '@/theme';

import { Tab } from './types';

interface InventoryTabSelectorProps {
  tab: Tab;
  onSelectTab: (tab: Tab) => void;
  expiringCount: number;
  expiringUrgent: boolean;
  lowStockCount: number;
}

export function InventoryTabSelector({
  tab,
  onSelectTab,
  expiringCount,
  expiringUrgent,
  lowStockCount,
}: InventoryTabSelectorProps) {
  return (
    <View className="flex-row gap-1 px-4 pt-2 pb-1.5 border-b border-border-subtle">
      <Pressable
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-full border ${
          tab === 'all' ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border-default'
        }`}
        onPress={() => onSelectTab('all')}
      >
        <Package
          size={15}
          color={tab === 'all' ? '#ffffff' : colors.text.secondary}
          strokeWidth={2.2}
        />
        <Text
          className={`text-xs font-bold ${
            tab === 'all' ? 'text-white' : 'text-text-secondary'
          }`}
        >
          {tr('inv.tabAll')}
        </Text>
      </Pressable>

      <Pressable
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-full border ${
          tab === 'expiring' ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border-default'
        }`}
        onPress={() => onSelectTab('expiring')}
      >
        <AlertTriangle
          size={15}
          color={tab === 'expiring' ? '#ffffff' : colors.feedback.warning}
          strokeWidth={2.2}
        />
        <Text
          className={`text-xs font-bold ${
            tab === 'expiring' ? 'text-white' : 'text-text-secondary'
          }`}
        >
          {tr('inv.tabExpiring')}
        </Text>
        {expiringCount > 0 && (
          <View
            className={`min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center ${
              expiringUrgent ? 'bg-red-500' : 'bg-amber-500'
            }`}
          >
            <Text className="text-[10px] font-extrabold text-white">{expiringCount}</Text>
          </View>
        )}
      </Pressable>

      <Pressable
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-full border ${
          tab === 'lowStock' ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border-default'
        }`}
        onPress={() => onSelectTab('lowStock')}
      >
        <TrendingDown
          size={15}
          color={tab === 'lowStock' ? '#ffffff' : colors.feedback.warning}
          strokeWidth={2.2}
        />
        <Text
          className={`text-xs font-bold ${
            tab === 'lowStock' ? 'text-white' : 'text-text-secondary'
          }`}
        >
          {tr('inv.tabLowStock')}
        </Text>
        {lowStockCount > 0 && (
          <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 items-center justify-center">
            <Text className="text-[10px] font-extrabold text-white">{lowStockCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
