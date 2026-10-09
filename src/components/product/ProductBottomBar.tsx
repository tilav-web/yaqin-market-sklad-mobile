import { Minus, Plus, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { typography } from '@/theme';

interface ProductBottomBarProps {
  outOfStock: boolean;
  quantityInCart?: number;
  onAddToCart: () => void;
  onUpdateQty: (delta: number) => void;
  onGoToCart: () => void;
  activeColors?: any;
}

export function ProductBottomBar({
  outOfStock,
  quantityInCart,
  onAddToCart,
  onUpdateQty,
  onGoToCart,
}: ProductBottomBarProps) {
  const { tr } = useTranslation();
  const { colors } = useTheme();

  return (
    <SafeAreaView
      edges={['bottom']}
      className="border-t px-4 py-2"
      style={{
        backgroundColor: colors.bg.surface,
        borderTopColor: colors.border.subtle,
      }}
    >
      {outOfStock ? (
        <View
          className="h-12 rounded-xl flex-row items-center justify-center gap-1.5"
          style={{ backgroundColor: colors.border.default }}
        >
          <Text style={[typography.button, { color: colors.text.onPrimary }]}>
            {tr('product.outOfStock')}
          </Text>
        </View>
      ) : quantityInCart && quantityInCart > 0 ? (
        <View className="flex-row items-center gap-3">
          <View
            className="flex-row items-center border-[1.5px] rounded-xl h-12"
            style={{
              borderColor: colors.brand.primary,
              backgroundColor: colors.brand.primarySurface,
            }}
          >
            <Pressable onPress={() => onUpdateQty(-1)} className="w-11 h-full items-center justify-center">
              <Minus size={18} color={colors.brand.primary} strokeWidth={3} />
            </Pressable>
            <Text
              className="min-w-[28px] text-center"
              style={[typography.bodyStrong, { color: colors.brand.primary }]}
            >
              {quantityInCart}
            </Text>
            <Pressable onPress={() => onUpdateQty(1)} className="w-11 h-full items-center justify-center">
              <Plus size={18} color={colors.brand.primary} strokeWidth={3} />
            </Pressable>
          </View>
          <Pressable
            className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
            style={{ backgroundColor: colors.brand.primary }}
            onPress={onGoToCart}
          >
            <ShoppingCart size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
            <Text style={[typography.button, { color: colors.text.onPrimary }]}>
              {tr('product.goToCart')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onAddToCart}
          disabled={outOfStock}
          className="h-12 rounded-xl flex-row items-center justify-center gap-1.5"
          style={{ backgroundColor: outOfStock ? colors.border.default : colors.brand.primary }}
        >
          <ShoppingBag size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
          <Text style={[typography.button, { color: colors.text.onPrimary }]}>
            {outOfStock ? tr('shop.outOfStock') : tr('prodDet.addToCart')}
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
