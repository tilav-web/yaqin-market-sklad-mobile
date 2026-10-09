import { router } from 'expo-router';
import { ChevronRight, Package } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { PublicProductVariant } from '@/lib/types';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';

interface ChatAttachedProductProps {
  readonly product: PublicProductVariant;
}

export function ChatAttachedProduct({ product }: ChatAttachedProductProps) {
  const { tr } = useTranslation();
  const photo = product.photos?.[0];

  const handlePress = () => {
    haptics.selection();
    router.push(`/product/${product.id}` as never);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center px-3.5 py-2.5 bg-bg-surface border-b border-border-subtle active:opacity-90"
    >
      <View className="w-12 h-12 rounded-xl overflow-hidden mr-3 bg-surface-muted border border-border-subtle">
        {photo ? (
          <Image
            source={{ uri: resolveMedia(photo) }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-brand-surface">
            <Package size={22} className="text-brand-primary" />
          </View>
        )}
      </View>

      <View className="flex-1 mr-2">
        <Text className="text-[13.5px] font-bold text-text-primary" numberOfLines={1}>
          {product.name}
        </Text>
        <Text className="text-xs font-black text-brand-primary mt-0.5">
          {formatMoney(product.discountPrice ?? product.price)} {tr('common.som')}
        </Text>
      </View>

      <View className="flex-row items-center gap-0.5 px-2.5 py-1 rounded-full bg-brand-surface">
        <Text className="text-xs font-bold text-brand-primary">{tr('chat.viewProduct')}</Text>
        <ChevronRight size={13} className="text-brand-primary" />
      </View>
    </Pressable>
  );
}
