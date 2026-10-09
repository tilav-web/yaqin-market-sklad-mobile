import { Store } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface TelegramShopsEmptyProps {
  readonly searchQuery: string;
  readonly activeColors: any;
}

export function TelegramShopsEmpty({ searchQuery, activeColors }: TelegramShopsEmptyProps) {
  return (
    <View className="items-center justify-center py-14 px-6">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: activeColors.brand.primarySurface }}
      >
        <Store size={44} color={activeColors.brand.primary} />
      </View>
      <Text className="text-lg font-bold text-text-primary mb-1.5 text-center">
        Do'konlar topilmadi
      </Text>
      <Text className="text-sm text-text-secondary text-center leading-5 mb-6">
        {searchQuery.trim()
          ? `"${searchQuery}" bo'yicha do'konlar topilmadi`
          : "Yaqin-atrofda faol do'konlar mavjud emas"}
      </Text>
    </View>
  );
}
