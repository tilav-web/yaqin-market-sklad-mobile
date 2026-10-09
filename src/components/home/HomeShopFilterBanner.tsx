import { Store, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface HomeShopFilterBannerProps {
  activeShopId: string | null;
  activeShopName: string | null;
  onClear: () => void;
}

export function HomeShopFilterBanner({
  activeShopId,
  activeShopName,
  onClear,
}: HomeShopFilterBannerProps) {
  const { colors: activeColors } = useTheme();

  if (!activeShopId) return null;

  return (
    <View
      className="flex-row items-center justify-between mx-4 my-1.5 px-3 py-2 rounded-xl border"
      style={{
        backgroundColor: activeColors.brand.primarySurface,
        borderColor: activeColors.brand.primaryBorder,
      }}
    >
      <View className="flex-row items-center gap-1.5 flex-1 mr-2">
        <Store size={15} color={activeColors.brand.primary} />
        <Text
          className="text-xs font-semibold"
          style={{ color: activeColors.text.primary }}
          numberOfLines={1}
        >
          Faqat{' '}
          <Text style={{ fontWeight: '800', color: activeColors.brand.primary }}>
            {activeShopName}
          </Text>{' '}
          tovarlari ko&apos;rsatilmoqda
        </Text>
      </View>
      <Pressable
        onPress={() => {
          haptics.selection();
          onClear();
        }}
        hitSlop={8}
        className="flex-row items-center gap-1 px-2 py-1 rounded-full"
        style={{ backgroundColor: activeColors.bg.surface }}
      >
        <X size={12} color={activeColors.text.secondary} />
        <Text
          className="text-[11px] font-bold"
          style={{ color: activeColors.text.secondary }}
        >
          Barchasi
        </Text>
      </Pressable>
    </View>
  );
}
