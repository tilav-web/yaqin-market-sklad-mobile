import { ListChecks, Pin } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useShoppingListStore } from '@/stores/shoppingList';

interface TelegramSavedMessagesRowProps {
  readonly onPress: () => void;
  readonly activeColors: {
    bg: { surface: string; surfaceMuted: string };
    brand: { primary: string; primarySurface: string };
    border: { subtle: string };
    text: { primary: string; secondary: string; tertiary?: string };
  };
}

export function TelegramSavedMessagesRow({ onPress, activeColors }: TelegramSavedMessagesRowProps) {
  const { tr } = useTranslation();
  const items = useShoppingListStore((s) => s.items);
  const activeCount = items.filter((i) => !i.completed).length;
  const latestItem = items[0]?.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tr('chat.savedMessages')}
      className="flex-row px-4 py-3 items-center border-b"
      style={({ pressed }) => [
        {
          backgroundColor: activeColors.bg.surface,
          borderBottomColor: activeColors.border.subtle,
        },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      {/* Shopping List Icon */}
      <View className="mr-3.5">
        <View
          className="w-[52px] h-[52px] rounded-2xl items-center justify-center"
          style={{ backgroundColor: activeColors.brand.primary }}
        >
          <ListChecks size={25} color="#FFFFFF" strokeWidth={2.4} />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 justify-center">
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center gap-2 flex-1 mr-2">
            <Text
              className="text-[15.5px] font-bold"
              style={{ color: activeColors.text.primary }}
              numberOfLines={1}
            >
              {tr('chat.savedMessages')}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            {activeCount > 0 && (
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: activeColors.brand.primarySurface }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: activeColors.brand.primary }}
                >
                  {activeCount}
                </Text>
              </View>
            )}
            <Pin
              size={14}
              color={activeColors.text.tertiary || activeColors.text.secondary}
              style={{ transform: [{ rotate: '45deg' }] }}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text
            className="text-[13px] flex-1 leading-[18px]"
            style={{ color: activeColors.text.secondary }}
            numberOfLines={1}
          >
            {latestItem ? `📝 ${latestItem}` : tr('chat.savedMessagesDesc')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
