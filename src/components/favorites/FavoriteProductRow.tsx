import { router } from 'expo-router';
import { Heart, Package } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { PublicProductVariant } from '@/lib/types';
import { colors } from '@/theme';
import { getLocalizedText } from '@/utils/text';

interface FavoriteProductRowProps {
  readonly product: PublicProductVariant;
  readonly onUnfav: () => void;
}

export function FavoriteProductRow({ product, onUnfav }: FavoriteProductRowProps) {
  return (
    <Pressable
      className="bg-surface rounded-2xl p-3.5 flex-row items-center gap-3 border border-border-subtle shadow-xs active:opacity-85"
      onPress={() => router.push(`/product/${product.id}`)}>
      <View className="w-11 h-11 rounded-full bg-brand-primary/10 items-center justify-center">
        <Package size={22} color={colors.brand.primary} strokeWidth={2} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-text-primary" numberOfLines={1}>
          {getLocalizedText(product.name)}
        </Text>
        <Text className="text-xs font-bold text-brand-primary mt-0.5" numberOfLines={1}>
          {product.discountPrice
            ? `${product.discountPrice.toLocaleString()} so'm`
            : `${product.price.toLocaleString()} so'm`}
        </Text>
      </View>
      <Pressable hitSlop={12} onPress={onUnfav} className="p-2">
        <Heart size={22} color={colors.brand.primary} fill={colors.brand.primary} strokeWidth={0} />
      </Pressable>
    </Pressable>
  );
}
