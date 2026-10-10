import { Search } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useSearchModalStore } from '@/stores/searchModal';
import { haptics } from '@/utils/haptics';

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
  const openSearch = useSearchModalStore((s) => s.open);

  const handleOpenSearch = () => {
    haptics.selection();
    openSearch();
  };

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

      <Pressable
        onPress={handleOpenSearch}
        accessibilityRole="button"
        accessibilityLabel={tr('common.search') || 'Qidirish'}
        hitSlop={8}
        className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
        style={{ backgroundColor: activeColors.bg.surfaceMuted }}
      >
        <Search size={18} color={activeColors.text.primary} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
