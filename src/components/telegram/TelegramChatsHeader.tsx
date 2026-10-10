import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@/i18n';

interface TelegramChatsHeaderProps {
  readonly unreadTotal: number;
  readonly activeColors: {
    bg: { surface: string; surfaceMuted: string };
    brand: { primary: string };
    border: { subtle: string };
    text: { primary: string; secondary: string };
  };
}

export function TelegramChatsHeader({
  unreadTotal,
  activeColors,
}: TelegramChatsHeaderProps) {
  const { tr } = useTranslation();

  return (
    <View
      className="px-4 py-2.5 flex-row items-center justify-between border-b"
      style={{
        backgroundColor: activeColors.bg.surface,
        borderBottomColor: activeColors.border.subtle,
      }}
    >
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[22px] font-black tracking-tight" style={{ color: activeColors.text.primary }}>
          {tr('chat.title') || 'Chatlar'}
        </Text>
        {unreadTotal > 0 && (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: activeColors.brand.primary }}
          >
            <Text className="text-white text-xs font-bold">{unreadTotal}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
