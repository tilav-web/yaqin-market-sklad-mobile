import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

interface SellerHubRowProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}

export function SellerHubRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  last,
}: SellerHubRowProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className={`flex-row items-center gap-3.5 p-4 active:bg-surface-muted ${
        !last ? 'border-b border-border-subtle' : ''
      }`}
    >
      <View className="w-10 h-10 rounded-full bg-brand-primary-surface items-center justify-center">
        <Icon size={20} color={colors.brand.primary} strokeWidth={2.1} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-text-primary">{title}</Text>
        <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.2} />
    </Pressable>
  );
}
