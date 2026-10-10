import { ChevronRight, ListChecks } from 'lucide-react-native';
import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Category } from '@/lib/types';
import { useTheme } from '@/stores/theme';

interface TelegramSearchIdleListProps {
  categories: Category[];
  isDark: boolean;
  themeColors: ReturnType<typeof useTheme>['colors'];
  onSelectSaved: () => void;
  onSelectCategory: (name: string) => void;
}

export function TelegramSearchIdleList({
  categories,
  isDark,
  themeColors,
  onSelectSaved,
  onSelectCategory,
}: TelegramSearchIdleListProps) {
  const { tr, catName } = useTranslation();

  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <View className="pb-30">
          {/* Saved Messages */}
          <Pressable
            onPress={onSelectSaved}
            className="flex-row items-center py-2.5 border-b"
            style={{ borderBottomColor: themeColors.border.subtle }}
          >
            <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
              <View className="w-full h-full items-center justify-center bg-[#E8392E]">
                <ListChecks size={22} color="#FFF" strokeWidth={2.4} />
              </View>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-bold" style={{ color: themeColors.text.primary }}>
                {tr('chat.savedMessages')}
              </Text>
              <Text className="text-[13.5px]" style={{ color: themeColors.text.secondary }}>
                {tr('chat.savedMessagesDesc')}
              </Text>
            </View>
            <ChevronRight size={18} color={themeColors.text.tertiary} />
          </Pressable>

          {/* Popular categories */}
          {categories.length > 0 && (
            <View className="mt-4">
              <Text
                className="text-xs font-bold tracking-wider mb-1.5 uppercase"
                style={{ color: themeColors.text.secondary }}
              >
                {tr('search.categories').toUpperCase()}
              </Text>
              {categories.slice(0, 8).map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => onSelectCategory(cat.nameUzLatn)}
                  className="flex-row items-center py-2.5 border-b"
                  style={{ borderBottomColor: themeColors.border.subtle }}
                >
                  <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                    <View
                      className="w-full h-full items-center justify-center"
                      style={{ backgroundColor: isDark ? '#374151' : '#E2E8F0' }}
                    >
                      {cat.iconUrl ? (
                        <Image source={{ uri: cat.iconUrl }} className="w-full h-full" />
                      ) : (
                        <Text className="text-lg">🛍️</Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text
                      className="text-base font-bold"
                      style={{ color: themeColors.text.primary }}
                    >
                      {catName(cat)}
                    </Text>
                    <Text
                      className="text-[13.5px]"
                      style={{ color: themeColors.text.secondary }}
                    >
                      {tr('search.empty.desc')}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={themeColors.text.tertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      }
    />
  );
}
