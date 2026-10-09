import { MessageCircle, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';

interface TelegramChatsEmptyProps {
  onExplore: () => void;
  activeColors: {
    brand: { primary: string; primarySurface: string };
    text: { primary: string; secondary: string };
  };
}

export function TelegramChatsEmpty({ onExplore, activeColors }: TelegramChatsEmptyProps) {
  const { tr } = useTranslation();

  return (
    <View className="items-center justify-center py-14 px-6">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: activeColors.brand.primarySurface }}
      >
        <MessageCircle size={44} color={activeColors.brand.primary} />
      </View>
      <Text
        className="text-lg font-bold mb-1.5 text-center"
        style={{ color: activeColors.text.primary }}
      >
        {tr('chat.emptyTitle')}
      </Text>
      <Text
        className="text-sm text-center leading-5 mb-6"
        style={{ color: activeColors.text.secondary }}
      >
        {tr('chat.emptyDesc')}
      </Text>
      <Pressable
        onPress={onExplore}
        className="flex-row items-center gap-2 px-5 py-3 rounded-full"
        style={{ backgroundColor: activeColors.brand.primary }}
      >
        <ShoppingBag size={18} color="#FFFFFF" />
        <Text className="font-bold text-white text-sm">{tr('chat.exploreButton')}</Text>
      </Pressable>
    </View>
  );
}
