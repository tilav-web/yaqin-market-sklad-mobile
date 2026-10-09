import { router } from 'expo-router';
import { ArrowLeft, Store } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { colors } from '@/theme';

interface ChatHeaderProps {
  chatTitle: string | undefined;
  shopId: string | undefined;
}

export function ChatHeader({ chatTitle, shopId }: ChatHeaderProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <View
      className="flex-row items-center justify-between px-4 py-2.5 border-b"
      style={{
        backgroundColor: activeColors.bg.surface,
        borderBottomColor: activeColors.border.subtle,
      }}
    >
      <Pressable onPress={() => router.back()} hitSlop={12} className="p-1.5 rounded-full">
        <ArrowLeft size={22} color={activeColors.text.primary} />
      </Pressable>

      <View className="flex-1 items-center mx-2">
        <Text
          className="text-base font-bold"
          style={{ color: activeColors.text.primary }}
          numberOfLines={1}
        >
          {chatTitle || (shopId ? tr('nav.shop') : tr('nav.chat'))}
        </Text>
        <Text className="text-[11px] font-medium" style={{ color: colors.feedback.success }}>
          {tr('chat.online')}
        </Text>
      </View>

      {shopId ? (
        <Pressable
          onPress={() => router.push(`/shop/${shopId}` as never)}
          className="p-1.5 rounded-full"
          style={{ backgroundColor: activeColors.brand.primarySurface }}
        >
          <Store size={20} color={activeColors.brand.primary} />
        </Pressable>
      ) : (
        <View className="w-8" />
      )}
    </View>
  );
}
