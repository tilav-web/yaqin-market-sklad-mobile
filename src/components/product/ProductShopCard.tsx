import { router } from 'expo-router';
import { ChevronRight, MessageCircle, Store } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { VariantDetail } from '@/lib/types';
import { haptics } from '@/utils/haptics';

interface ProductShopCardProps {
  shop: NonNullable<VariantDetail['shop']>;
  productId: string;
  activeColors: {
    brand: { primary: string; primarySurface: string };
    bg: { surfaceMuted: string };
    border: { subtle: string };
    text: { primary: string; secondary: string; hint: string };
  };
}

export function ProductShopCard({ shop, productId, activeColors }: ProductShopCardProps) {
  const { tr } = useTranslation();

  return (
    <View className="flex-row items-center gap-2 mt-4">
      <Pressable
        className="flex-1 flex-row items-center gap-3 p-3 rounded-2xl border"
        style={{
          backgroundColor: activeColors.bg.surfaceMuted,
          borderColor: activeColors.border.subtle,
        }}
        onPress={() => {
          haptics.selection();
          router.push(`/shop/${shop.id}`);
        }}
      >
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: activeColors.brand.primarySurface }}
        >
          <Store size={18} color={activeColors.brand.primary} strokeWidth={2.2} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-extrabold" style={{ color: activeColors.text.primary }}>
            {shop.name}
          </Text>
          <Text className="text-[11px] mt-0.5" style={{ color: activeColors.text.secondary }}>
            {shop.isOpenManual ? tr('shop.open') : tr('shop.closed')} · {tr('product.goToShop')}
          </Text>
        </View>
        <ChevronRight size={20} color={activeColors.text.hint} />
      </Pressable>
      <Pressable
        className="flex-row items-center gap-1.5 px-3 h-13 rounded-2xl justify-center"
        style={{ backgroundColor: activeColors.brand.primary }}
        onPress={() => {
          haptics.selection();
          router.push({
            pathname: '/chat/[orderId]',
            params: {
              orderId: `shop_${shop.id}`,
              shopId: shop.id,
              title: shop.name,
              productId,
            },
          });
        }}
      >
        <MessageCircle size={16} color="#FFFFFF" strokeWidth={2.4} />
        <Text className="text-xs font-extrabold text-white">{tr('nav.chat') || 'Chat'}</Text>
      </Pressable>
    </View>
  );
}
