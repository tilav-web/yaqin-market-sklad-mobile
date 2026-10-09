import { router } from 'expo-router';
import { Bell, ChevronDown, MapPin, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface HomeTopBarProps {
  locationLabel: string;
  onOpenLocationPicker: () => void;
  totalCartCount: number;
}

export function HomeTopBar({
  locationLabel,
  onOpenLocationPicker,
  totalCartCount,
}: HomeTopBarProps) {
  const { colors: activeColors } = useTheme();

  return (
    <View
      className="flex-row items-center justify-between px-4 py-2.5"
      style={{
        backgroundColor: activeColors.bg.surface,
        borderBottomWidth: 1,
        borderBottomColor: activeColors.border.subtle,
      }}
    >
      {/* Left: Location Picker */}
      <Pressable
        onPress={() => {
          haptics.selection();
          onOpenLocationPicker();
        }}
        className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full max-w-[135px]"
        style={{ backgroundColor: activeColors.bg.surfaceMuted }}
      >
        <MapPin size={15} color={activeColors.brand.primary} />
        <Text
          className="text-xs font-bold max-w-[80px]"
          style={[{ color: activeColors.text.primary }]}
          numberOfLines={1}
        >
          {locationLabel}
        </Text>
        <ChevronDown size={14} color={activeColors.text.secondary} />
      </Pressable>

      {/* Center: Brand Name */}
      <View className="items-center">
        <Text
          className="text-xl font-black tracking-tighter"
          style={[{ color: activeColors.brand.primary }]}
        >
          Yaqin
        </Text>
      </View>

      {/* Right: Cart & Notifications */}
      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={() => {
            haptics.selection();
            router.push('/(tabs)/carts');
          }}
          className="w-9 h-9 rounded-full items-center justify-center relative"
          style={{ backgroundColor: activeColors.bg.surfaceMuted }}
        >
          <ShoppingBag size={19} color={activeColors.text.primary} />
          {totalCartCount > 0 && (
            <View
              className="absolute -top-1 -right-1 min-w-[19px] h-[19px] rounded-full items-center justify-center px-1"
              style={{
                backgroundColor: activeColors.brand.primary,
                borderWidth: 1.5,
                borderColor: activeColors.bg.surface,
              }}
            >
              <Text className="text-white text-[10px] font-black leading-3 text-center">
                {totalCartCount > 99 ? '99+' : totalCartCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            haptics.selection();
            router.push('/notifications');
          }}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: activeColors.bg.surfaceMuted }}
        >
          <Bell size={19} color={activeColors.text.primary} />
        </Pressable>
      </View>
    </View>
  );
}
