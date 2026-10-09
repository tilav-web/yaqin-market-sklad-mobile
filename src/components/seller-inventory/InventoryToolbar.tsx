import {
  ClipboardCheck,
  FileSpreadsheet,
  ScanLine,
  Search,
  Tag,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { tr } from '@/i18n';
import { colors } from '@/theme';

interface InventoryToolbarProps {
  searchInput: string;
  onSearchChange: (text: string) => void;
  lowOnly: boolean;
  onToggleLowOnly: () => void;
  onOpenBulkPrice: () => void;
  onOpenExcel: () => void;
  onOpenScanner: () => void;
  onOpenCount: () => void;
}

export function InventoryToolbar({
  searchInput,
  onSearchChange,
  lowOnly,
  onToggleLowOnly,
  onOpenBulkPrice,
  onOpenExcel,
  onOpenScanner,
  onOpenCount,
}: InventoryToolbarProps) {
  return (
    <View className="px-4 pt-2 pb-2 gap-2 border-b border-border-subtle">
      <View className="flex-row items-center gap-2 bg-bg-surface rounded-xl px-3 border border-border-default">
        <Search size={17} color={colors.text.tertiary} strokeWidth={2.2} />
        <TextInput
          className="flex-1 py-2 text-base text-text-primary"
          value={searchInput}
          onChangeText={onSearchChange}
          placeholder={tr('inv.searchPlaceholder')}
          placeholderTextColor={colors.text.hint}
          returnKeyType="search"
        />
        {searchInput.length > 0 ? (
          <Pressable onPress={() => onSearchChange('')} hitSlop={8}>
            <Text className="text-base text-text-tertiary px-1">✕</Text>
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onToggleLowOnly}
          className={`flex-1 items-center px-3 py-2 rounded-full border ${
            lowOnly
              ? 'bg-feedback-warning border-feedback-warning'
              : 'border-border-default bg-bg-surface'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              lowOnly ? 'text-text-on-primary' : 'text-text-secondary'
            }`}
          >
            {tr('inv.lowOnlyChip')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenBulkPrice}
          className="w-9 h-9 rounded-full border border-brand-primary/20 bg-brand-primary/10 items-center justify-center active:opacity-75"
        >
          <Tag size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          onPress={onOpenExcel}
          className="w-9 h-9 rounded-full border border-brand-primary/20 bg-brand-primary/10 items-center justify-center active:opacity-75"
        >
          <FileSpreadsheet size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          onPress={onOpenScanner}
          className="w-9 h-9 rounded-full border border-brand-primary/20 bg-brand-primary/10 items-center justify-center active:opacity-75"
        >
          <ScanLine size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          onPress={onOpenCount}
          className="w-9 h-9 rounded-full border border-brand-primary/20 bg-brand-primary/10 items-center justify-center active:opacity-75"
        >
          <ClipboardCheck size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}
