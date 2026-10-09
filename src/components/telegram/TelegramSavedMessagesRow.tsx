import { Bookmark, Pin } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';

interface TelegramSavedMessagesRowProps {
  onPress: () => void;
  activeColors: {
    bg: { surface: string; surfaceMuted: string };
    brand: { primary: string };
    border: { subtle: string };
    text: { primary: string; secondary: string };
  };
}

export function TelegramSavedMessagesRow({ onPress, activeColors }: TelegramSavedMessagesRowProps) {
  const { tr } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row px-4 py-3 items-center border-b"
      style={({ pressed }) => [
        {
          backgroundColor: activeColors.bg.surface,
          borderBottomColor: activeColors.border.subtle,
        },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      <View className="mr-3.5">
        <View
          className="w-[52px] h-[52px] rounded-full items-center justify-center"
          style={{ backgroundColor: activeColors.brand.primary }}
        >
          <Bookmark size={24} color="#FFFFFF" />
        </View>
      </View>
      <View className="flex-1 justify-center">
        <View className="flex-row justify-between items-center mb-1">
          <Text
            className="text-base font-bold flex-1 mr-2"
            style={{ color: activeColors.text.primary }}
          >
            {tr('chat.savedMessages')}
          </Text>
          <Pin
            size={15}
            color={activeColors.text.secondary}
            style={{ transform: [{ rotate: '45deg' }] }}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text
            className="text-[13.5px] flex-1 leading-[18px]"
            style={{ color: activeColors.text.secondary }}
            numberOfLines={1}
          >
            {tr('chat.savedMessagesDesc')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
