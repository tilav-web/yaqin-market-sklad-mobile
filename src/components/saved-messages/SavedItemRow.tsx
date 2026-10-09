import { Check, Search, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ShoppingItem } from '@/stores/shoppingList';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface SavedItemRowProps {
  readonly item: ShoppingItem;
  readonly onToggle: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onSearch: (query: string) => void;
}

export function SavedItemRow({
  item,
  onToggle,
  onDelete,
  onSearch,
}: SavedItemRowProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <View
      className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-surface"
    >
      {/* Left: Checkbox + Text */}
      <Pressable
        onPress={() => {
          haptics.selection();
          onToggle(item.id);
        }}
        className="flex-row items-center flex-1 mr-3"
      >
        <View
          className={`w-6 h-6 rounded-lg items-center justify-center mr-3 border ${
            item.completed
              ? 'bg-emerald-600 border-emerald-600'
              : 'bg-bg-surface-muted border-border-default'
          }`}
        >
          {item.completed && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
        </View>

        <Text
          className={`text-[15px] font-medium flex-1 ${
            item.completed
              ? 'text-text-hint line-through'
              : 'text-text-primary'
          }`}
          numberOfLines={2}
        >
          {item.text}
        </Text>
      </Pressable>

      {/* Right Actions: Smart Search in Catalog + Delete */}
      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={() => {
            haptics.selection();
            onSearch(item.text);
          }}
          className="w-8 h-8 rounded-full items-center justify-center bg-brand-surface active:opacity-70"
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={tr('checklist.searchInCatalog')}
        >
          <Search size={15} color={activeColors.brand.primary} strokeWidth={2.4} />
        </Pressable>

        <Pressable
          onPress={() => {
            haptics.light();
            onDelete(item.id);
          }}
          className="w-8 h-8 rounded-full items-center justify-center bg-surface-muted active:opacity-70"
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={tr('common.delete')}
        >
          <Trash2 size={15} color={activeColors.text.hint} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
