import { Gift, MapPin, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { District } from '@/lib/types';
import { colors, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';

interface MapTopBarProps {
  district: District | null | undefined;
  searchQuery: string | undefined;
  onClearSearch: () => void;
  onlyFreeDelivery: boolean;
  onToggleFreeDelivery: () => void;
  isDark: boolean;
}

export function MapTopBar({
  district,
  searchQuery,
  onClearSearch,
  onlyFreeDelivery,
  onToggleFreeDelivery,
  isDark,
}: MapTopBarProps) {
  const { tr, t } = useTranslation();

  return (
    <SafeAreaView edges={['top']} className="absolute top-0 inset-x-0 px-4" pointerEvents="box-none">
      <View className="flex-row items-center justify-between gap-1 mt-1">
        {/* District Name Badge */}
        {district && !searchQuery && (
          <View
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] flex-shrink"
            style={[
              {
                backgroundColor: isDark ? '#1C2733' : '#FFFFFF',
                borderColor: isDark ? 'rgba(232, 57, 46, 0.4)' : colors.brand.primaryBorder,
              },
              shadow.md,
            ]}
          >
            <MapPin size={13} color={colors.brand.primary} strokeWidth={2.6} />
            <Text className="text-xs font-extrabold" style={{ color: colors.brand.primary }} numberOfLines={1}>
              {t(district.name)}
            </Text>
          </View>
        )}

        {/* Product Search Pill */}
        {searchQuery && (
          <View
            className="flex-row items-center gap-1 pl-3 pr-2 py-1.5 rounded-full border"
            style={[
              {
                backgroundColor: isDark ? '#1C2733' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border.subtle,
              },
              shadow.md,
            ]}
          >
            <Text
              className="text-xs font-bold max-w-[160px]"
              style={{ color: colors.brand.primary }}
              numberOfLines={1}
            >
              “{searchQuery}”
            </Text>
            <Pressable
              onPress={onClearSearch}
              hitSlop={8}
              className="w-5 h-5 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.bg.surfaceMuted }}
            >
              <X size={13} color={colors.text.secondary} strokeWidth={2.4} />
            </Pressable>
          </View>
        )}

        {/* Minimal Free Delivery Toggle Switch */}
        <Pressable
          className="flex-row items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border-[1.5px]"
          style={[
            {
              backgroundColor: onlyFreeDelivery
                ? colors.brand.primary
                : isDark
                  ? '#1C2733'
                  : '#FFFFFF',
              borderColor: onlyFreeDelivery
                ? colors.brand.primary
                : isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : colors.border.subtle,
            },
            shadow.md,
          ]}
          onPress={() => {
            haptics.selection();
            onToggleFreeDelivery();
          }}
        >
          <Gift
            size={13}
            color={onlyFreeDelivery ? '#FFFFFF' : colors.brand.primary}
            strokeWidth={2.4}
          />
          <Text
            className="text-[11.5px] font-extrabold"
            style={{ color: onlyFreeDelivery ? '#FFFFFF' : colors.brand.primary }}
          >
            {tr('shop.freeShort')} {tr('map.filterDelivery')}
          </Text>
          <View
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: onlyFreeDelivery ? '#10B981' : '#CBD5E1' }}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
