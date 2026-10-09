import { Check, CheckCheck, Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { UnifiedChat } from './types';

interface TelegramChatRowProps {
  item: UnifiedChat;
  onPress: () => void;
  activeColors: {
    bg: { surface: string; surfaceMuted: string; surfaceElevated: string };
    brand: { primary: string };
    text: { primary: string; secondary: string; tertiary: string };
  };
}

export function TelegramChatRow({ item, onPress, activeColors }: TelegramChatRowProps) {
  const initials = item.title
    ? item.title
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'YM';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row px-4 py-3 items-center"
      style={({ pressed }) => [
        { backgroundColor: activeColors.bg.surface },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      {/* Telegram Circle Avatar */}
      <View className="relative mr-3.5">
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            className="w-[52px] h-[52px] rounded-full"
            style={{ backgroundColor: activeColors.bg.surfaceMuted }}
          />
        ) : (
          <View
            className="w-[52px] h-[52px] rounded-full items-center justify-center"
            style={{
              backgroundColor: item.isSellerSide
                ? activeColors.bg.surfaceElevated
                : activeColors.brand.primary,
            }}
          >
            {item.isSellerSide ? (
              <Text className="font-extrabold text-lg text-white">{initials}</Text>
            ) : (
              <Store size={22} color="#FFFFFF" />
            )}
          </View>
        )}
        {item.isSellerSide && (
          <View className="absolute -bottom-0.5 -right-1 bg-gray-700 rounded-full px-1.5 py-px">
            <Text className="text-white text-[8.5px] font-bold">Xaridor</Text>
          </View>
        )}
      </View>

      {/* Telegram Chat Content */}
      <View className="flex-1 justify-center">
        <View className="flex-row justify-between items-center mb-1">
          <Text
            className="text-base font-bold flex-1 mr-2"
            style={{ color: activeColors.text.primary }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text
              className={`text-xs ${
                item.unreadCount > 0 ? 'text-[#E8392E] font-bold' : 'font-medium'
              }`}
              style={item.unreadCount > 0 ? undefined : { color: activeColors.text.tertiary }}
            >
              {item.time}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between gap-2">
          <Text
            className={`text-[13.5px] flex-1 leading-[18px] ${
              item.unreadCount > 0 ? 'text-white font-semibold' : ''
            }`}
            style={item.unreadCount > 0 ? undefined : { color: activeColors.text.secondary }}
            numberOfLines={2}
          >
            {item.subtitle}
          </Text>

          {item.unreadCount > 0 ? (
            <View className="min-w-[20px] h-5 rounded-full bg-[#E8392E] px-1.5 items-center justify-center">
              <Text className="text-white text-[11px] font-extrabold leading-[14px]">
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          ) : item.isOrder ? (
            <CheckCheck size={16} color={activeColors.text.tertiary} />
          ) : (
            <Check size={16} color={activeColors.text.tertiary} />
          )}
        </View>
      </View>
    </Pressable>
  );
}
