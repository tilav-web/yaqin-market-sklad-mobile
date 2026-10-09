import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@/i18n';

interface TelegramChatsHeaderProps {
  readonly unreadTotal: number;
  readonly activeColors: any;
}

export function TelegramChatsHeader({
  unreadTotal,
  activeColors,
}: TelegramChatsHeaderProps) {
  const { tr } = useTranslation();

  return (
    <View
      className="px-4 py-3 flex-row items-center justify-between border-b border-border-subtle"
      style={{ backgroundColor: activeColors.bg.surface }}
    >
      <View className="flex-row items-center gap-2.5">
        <Text className="text-2xl font-black text-text-primary">{tr('chat.title') || 'Chatlar'}</Text>
        {unreadTotal > 0 && (
          <View className="bg-brand-primary rounded-full px-2 py-0.5">
            <Text className="text-white text-xs font-bold">{unreadTotal}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
