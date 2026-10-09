import { Store } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/stores/theme';

interface HomeShopFilterBannerProps {
  activeShopId: string | null;
  activeShopName: string | null;
}

export function HomeShopFilterBanner({
  activeShopId,
  activeShopName,
}: HomeShopFilterBannerProps) {
  const { colors: activeColors } = useTheme();

  if (!activeShopId) return null;

  return (
    <View
      className="flex-row items-center mx-4 my-1.5 px-3 py-2 rounded-xl border"
      style={{
        backgroundColor: activeColors.brand.primarySurface,
        borderColor: activeColors.brand.primaryBorder,
      }}
    >
      <View className="flex-row items-center gap-1.5 flex-1">
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
    </View>
  );
}
