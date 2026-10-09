import { router } from 'expo-router';
import {
  ChevronRight,
  MapPin,
  MessageCircle,
  Star,
  Store,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/stores/theme';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

interface TelegramShopRowProps {
  readonly shop: PublicShop;
}

export function TelegramShopRow({ shop }: TelegramShopRowProps) {
  const { colors: activeColors } = useTheme();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [chatLoading, setChatLoading] = useState(false);

  const photo = shop.photos && shop.photos.length > 0 ? shop.photos[0] : null;

  const handleOpenShop = useCallback(() => {
    haptics.selection();
    router.push(`/shop/${shop.id}` as any);
  }, [shop.id]);

  const handleChatWithShop = useCallback(async (e: any) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/(auth)/phone');
      return;
    }
    haptics.selection();
    setChatLoading(true);
    try {
      const res = await api.post(`/conversations/with-shop/${shop.id}`);
      const conv = res.data;
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: conv.id,
          conversationId: conv.id,
          shopId: shop.id,
          title: shop.name,
        },
      });
    } catch {
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: shop.id,
          shopId: shop.id,
          title: shop.name,
        },
      });
    } finally {
      setChatLoading(false);
    }
  }, [isAuthenticated, shop.id, shop.name]);

  return (
    <Pressable
      onPress={handleOpenShop}
      className="flex-row px-5 py-3 items-center"
      style={({ pressed }) => [
        { backgroundColor: activeColors.bg.surface },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}>
      {/* Telegram Shop Avatar */}
      <View className="relative mr-3">
        {photo ? (
          <Image
            source={{ uri: photo }}
            className="w-[54px] h-[54px] rounded-full"
            style={{ backgroundColor: activeColors.bg.surfaceMuted }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-[54px] h-[54px] rounded-full items-center justify-center"
            style={{ backgroundColor: activeColors.bg.surfaceMuted }}>
            <Store size={26} color={activeColors.brand.primary} />
          </View>
        )}
        <View
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 ${
            shop.isOpenManual ? 'bg-[#1F9D63]' : 'bg-[#A39D96]'
          }`}
          style={{ borderColor: activeColors.bg.surface }}
        />
      </View>

      {/* Middle shop details */}
      <View className="flex-1 justify-center mr-2">
        <View className="flex-row items-center mb-0.5">
          <Text
            className="text-base font-bold"
            style={{ color: activeColors.text.primary }}
            numberOfLines={1}>
            {shop.name}
          </Text>
        </View>

        <View className="flex-row items-center gap-2 mb-0.5">
          {shop.ratingAverage > 0 && (
            <View className="flex-row items-center gap-0.5">
              <Star size={12} color={colors.feedback.warning} fill={colors.feedback.warning} />
              <Text className="text-xs font-bold" style={{ color: activeColors.text.primary }}>
                {shop.ratingAverage.toFixed(1)}
              </Text>
            </View>
          )}

          {shop.distanceKm !== undefined && (
            <View className="flex-row items-center gap-0.5">
              <MapPin size={11} color={activeColors.text.tertiary} />
              <Text className="text-xs" style={{ color: activeColors.text.tertiary }}>
                {shop.distanceKm < 1 ? `${Math.round(shop.distanceKm * 1000)} m` : `${shop.distanceKm.toFixed(1)} km`}
              </Text>
            </View>
          )}
        </View>

        <Text className="text-xs" style={{ color: activeColors.text.secondary }} numberOfLines={1}>
          {shop.address}
        </Text>
      </View>

      {/* Right action: chat button & chevron */}
      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={handleChatWithShop}
          disabled={chatLoading}
          className="w-9 h-9 rounded-full border items-center justify-center active:opacity-70"
          style={{
            backgroundColor: activeColors.brand.primarySurface,
            borderColor: activeColors.brand.primaryBorder,
          }}>
          {chatLoading ? (
            <ActivityIndicator size="small" color={activeColors.brand.primary} />
          ) : (
            <MessageCircle size={16} color={activeColors.brand.primary} />
          )}
        </Pressable>

        <ChevronRight size={18} color={activeColors.text.tertiary} />
      </View>
    </Pressable>
  );
}
