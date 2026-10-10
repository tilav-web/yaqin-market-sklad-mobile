import { CheckCheck, Package, Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { getOrderStatusConfig } from './chatStatusUtils';
import { UnifiedChat } from './types';

interface TelegramChatRowProps {
  readonly item: UnifiedChat;
  readonly onPress: () => void;
  readonly activeColors: {
    bg: { surface: string; surfaceMuted: string; surfaceElevated: string };
    brand: { primary: string; primarySurface: string };
    border: { subtle: string };
    text: { primary: string; secondary: string; tertiary: string };
  };
}

export function TelegramChatRow({ item, onPress, activeColors }: TelegramChatRowProps) {
  const { tr } = useTranslation();

  const initials = item.title
    ? item.title
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'YM';

  const orderConfig = item.isOrder && item.orderStatus
    ? getOrderStatusConfig(item.orderStatus, tr)
    : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      className="flex-row px-4 py-3 items-center"
      style={({ pressed }) => [
        { backgroundColor: activeColors.bg.surface },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      {/* Avatar Container */}
      <View className="relative mr-3.5">
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            className="w-[52px] h-[52px] rounded-2xl border"
            style={{
              backgroundColor: activeColors.bg.surfaceMuted,
              borderColor: activeColors.border.subtle,
            }}
          />
        ) : (
          <View
            className="w-[52px] h-[52px] rounded-2xl items-center justify-center border"
            style={{
              backgroundColor: item.isOrder
                ? activeColors.brand.primarySurface
                : item.isSellerSide
                  ? activeColors.bg.surfaceElevated
                  : activeColors.brand.primary,
              borderColor: activeColors.border.subtle,
            }}
          >
            {item.isOrder ? (
              <Package size={24} color={activeColors.brand.primary} strokeWidth={2.2} />
            ) : item.isSellerSide ? (
              <Text className="font-extrabold text-base text-white">{initials}</Text>
            ) : (
              <Store size={24} color="#FFFFFF" strokeWidth={2.2} />
            )}
          </View>
        )}

        {/* Small role/order indicator pill on avatar */}
        {item.isSellerSide ? (
          <View className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full px-1.5 py-0.5 border border-white">
            <Text className="text-white text-[8px] font-black uppercase">Xaridor</Text>
          </View>
        ) : item.isOrder ? (
          <View
            className="absolute -bottom-1 -right-1 rounded-full p-1 border"
            style={{
              backgroundColor: activeColors.brand.primary,
              borderColor: activeColors.bg.surface,
            }}
          >
            <Package size={9} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        ) : null}
      </View>

      {/* Chat Details */}
      <View className="flex-1 justify-center">
        {/* Top Header line: Title + Order Tag + Time */}
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center gap-1.5 flex-1 mr-2">
            <Text
              className="text-[15.5px] font-bold"
              style={{ color: activeColors.text.primary }}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            {item.isOrder && (
              <View
                className="px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: activeColors.bg.surfaceMuted }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: activeColors.text.secondary }}
                >
                  {tr('chat.orderBadge') || 'Buyurtma'}
                </Text>
              </View>
            )}
          </View>

          <Text
            className={`text-xs ${
              item.unreadCount > 0 ? 'font-bold' : 'font-medium'
            }`}
            style={{
              color: item.unreadCount > 0
                ? activeColors.brand.primary
                : activeColors.text.tertiary,
            }}
          >
            {item.time}
          </Text>
        </View>

        {/* Subtitle line: Message snippet or Order Status Badge */}
        <View className="flex-row items-center justify-between gap-2">
          {orderConfig ? (
            <View className="flex-row items-center gap-1.5 flex-1">
              <View
                className="px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: orderConfig.bg,
                  borderColor: orderConfig.border,
                }}
              >
                <Text
                  className="text-[11px] font-extrabold"
                  style={{ color: orderConfig.text }}
                >
                  {orderConfig.label}
                </Text>
              </View>

              {item.orderNumber && (
                <Text
                  className="text-xs font-semibold"
                  style={{ color: activeColors.text.secondary }}
                >
                  #{item.orderNumber}
                </Text>
              )}
            </View>
          ) : (
            <Text
              className={`text-[13.5px] flex-1 leading-[18px] ${
                item.unreadCount > 0 ? 'font-semibold' : 'font-normal'
              }`}
              style={{
                color: item.unreadCount > 0
                  ? activeColors.text.primary
                  : activeColors.text.secondary,
              }}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          )}

          {/* Right action / status */}
          {item.unreadCount > 0 ? (
            <View
              className="min-w-[20px] h-5 rounded-full px-1.5 items-center justify-center"
              style={{ backgroundColor: activeColors.brand.primary }}
            >
              <Text className="text-white text-[11px] font-black leading-[14px]">
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          ) : (
            <CheckCheck size={16} color={activeColors.text.tertiary} strokeWidth={2} />
          )}
        </View>
      </View>
    </Pressable>
  );
}
