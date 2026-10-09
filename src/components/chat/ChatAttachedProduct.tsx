import { router } from 'expo-router';
import { ChevronRight, Package } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { PublicProductVariant } from '@/lib/types';
import { colors } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';

interface ChatAttachedProductProps {
  product: PublicProductVariant;
}

export function ChatAttachedProduct({ product }: ChatAttachedProductProps) {
  const { tr } = useTranslation();

  return (
    <View className="flex-row items-center bg-white px-4 py-2 border-b border-[#FBD9D5]">
      {product.photos?.[0] ? (
        <Image source={{ uri: product.photos[0] }} className="w-11 h-11 rounded-lg bg-[#ECE9E6]" />
      ) : (
        <View className="w-11 h-11 rounded-lg bg-[#FDECEA] items-center justify-center">
          <Package size={20} color={colors.brand.primary} />
        </View>
      )}
      <View className="flex-1 mx-2">
        <Text className="text-[13px] font-bold text-[#191715]" numberOfLines={1}>
          {product.name}
        </Text>
        <Text className="text-xs font-extrabold text-[#E8392E]">
          {formatMoney(product.discountPrice ?? product.price)} {tr('common.som')}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push(`/product/${product.id}` as never)}
        className="flex-row items-center gap-0.5"
      >
        <Text className="text-xs font-bold text-[#E8392E]">{tr('chat.viewProduct')}</Text>
        <ChevronRight size={14} color={colors.brand.primary} />
      </Pressable>
    </View>
  );
}
