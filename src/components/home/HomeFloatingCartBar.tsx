import { router } from 'expo-router';
import { ChevronRight, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { useTheme } from '@/stores/theme';
import { shadow } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';

interface HomeFloatingCartBarProps {
  totalTypes: number;
  totalUnits: number;
  totalPrice: number;
  bottomOffset: number;
}

export function HomeFloatingCartBar({
  totalTypes,
  totalUnits,
  totalPrice,
  bottomOffset,
}: HomeFloatingCartBarProps) {
  const { colors: activeColors } = useTheme();

  if (totalTypes <= 0) return null;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(200)}
      style={[
        {
          position: 'absolute',
          bottom: bottomOffset,
          left: 14,
          right: 14,
          zIndex: 50,
        },
        shadow.lg,
      ]}
    >
      <Pressable
        onPress={() => {
          haptics.selection();
          router.push('/(tabs)/carts');
        }}
        className="flex-row items-center justify-between px-4 py-3 rounded-2xl"
        style={{
          backgroundColor: activeColors.brand.primary,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center relative"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.22)' }}
          >
            <ShoppingBag size={20} color="#FFFFFF" strokeWidth={2.2} />
            <View
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-white items-center justify-center px-1"
            >
              <Text className="text-[10px] font-black text-black">
                {totalTypes}
              </Text>
            </View>
          </View>

          <View>
            <Text className="text-white font-extrabold text-[13.5px]">
              {totalTypes} tur ({totalUnits} dona)
            </Text>
            <Text className="text-white/85 text-[11.5px] font-semibold">
              {formatMoney(totalPrice)} so&apos;m
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
          <Text className="text-white font-extrabold text-xs">Savatcha</Text>
          <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.6} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
