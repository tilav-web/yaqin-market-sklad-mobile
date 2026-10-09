import { router } from 'expo-router';
import { ArrowLeft, Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface ChatHeaderProps {
  readonly chatTitle: string | undefined;
  readonly shopId: string | undefined;
  readonly avatarUrl?: string | null;
}

export function ChatHeader({ chatTitle, shopId, avatarUrl }: ChatHeaderProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  const title = chatTitle || (shopId ? tr('nav.shop') : tr('nav.chat'));
  const firstLetter = title.charAt(0).toUpperCase();

  const handleBack = () => {
    haptics.selection();
    router.back();
  };

  const handleOpenShop = () => {
    if (!shopId) return;
    haptics.selection();
    router.push(`/shop/${shopId}` as never);
  };

  return (
    <View
      className="flex-row items-center justify-between px-3 py-2 border-b bg-bg-surface"
      style={{ borderBottomColor: activeColors.border.subtle }}
    >
      {/* Left side: Back + Avatar + Name & Status */}
      <View className="flex-row items-center flex-1 mr-2">
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          className="w-9 h-9 rounded-full items-center justify-center active:opacity-70 mr-1"
          accessibilityRole="button"
          accessibilityLabel={tr('common.back')}
        >
          <ArrowLeft size={22} color={activeColors.text.primary} />
        </Pressable>

        {/* Circular Avatar */}
        <Pressable
          onPress={shopId ? handleOpenShop : undefined}
          className="mr-2.5 active:opacity-80"
        >
          {avatarUrl ? (
            <Image
              source={{ uri: resolveMedia(avatarUrl) }}
              className="w-10 h-10 rounded-full bg-surface-muted"
              resizeMode="cover"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-brand-primary/15 items-center justify-center border border-brand-primary/25">
              <Text className="text-base font-extrabold text-brand-primary">
                {firstLetter}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Shop Name & Telegram Online Status */}
        <Pressable
          onPress={shopId ? handleOpenShop : undefined}
          className="flex-1 justify-center active:opacity-80"
        >
          <Text
            className="text-[15.5px] font-bold text-text-primary"
            numberOfLines={1}
          >
            {title}
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <Text className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400">
              {tr('chat.online')}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Right side: Shop link action */}
      {shopId && (
        <Pressable
          onPress={handleOpenShop}
          className="w-9 h-9 rounded-full items-center justify-center bg-brand-surface active:opacity-70"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={tr('nav.shop')}
        >
          <Store size={19} color={activeColors.brand.primary} />
        </Pressable>
      )}
    </View>
  );
}
