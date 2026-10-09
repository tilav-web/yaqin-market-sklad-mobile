import { Search as SearchIcon, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';

interface TelegramChatsHeaderProps {
  readonly unreadTotal: number;
  readonly searchQuery: string;
  readonly onChangeSearch: (q: string) => void;
  readonly activeTabIndex: number;
  readonly activeColors: any;
}

export function TelegramChatsHeader({
  unreadTotal,
  searchQuery,
  onChangeSearch,
  activeTabIndex,
  activeColors,
}: TelegramChatsHeaderProps) {
  const { tr } = useTranslation();

  return (
    <View
      className="px-4 pt-2 pb-2.5 border-b border-border-subtle"
      style={{ backgroundColor: activeColors.bg.surface }}
    >
      <View className="flex-row items-center gap-2 mb-2.5">
        <Text className="text-2xl font-extrabold text-text-primary">{tr('chat.title')}</Text>
        {unreadTotal > 0 && (
          <View className="bg-brand-primary rounded-full px-2 py-0.5">
            <Text className="text-white text-xs font-bold">{unreadTotal}</Text>
          </View>
        )}
      </View>

      {/* Search Bar matching Telegram */}
      <View className="flex-row items-center rounded-full px-3 h-[38px] gap-2 mb-2.5 bg-surface-muted">
        <SearchIcon size={17} color={activeColors.text.secondary} />
        <TextInput
          value={searchQuery}
          onChangeText={onChangeSearch}
          placeholder={activeTabIndex === 0 ? tr('chat.searchPlaceholder') : "Do'konlarni qidirish..."}
          placeholderTextColor={activeColors.text.secondary}
          className="flex-1 text-sm py-0 text-text-primary"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onChangeSearch('')} hitSlop={8}>
            <X size={16} color={activeColors.text.secondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
