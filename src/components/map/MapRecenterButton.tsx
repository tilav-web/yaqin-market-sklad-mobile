import { Navigation } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

import { colors, shadow } from '@/theme';

interface MapRecenterButtonProps {
  bottomInset: number;
  onPress: () => void;
  isDark: boolean;
}

export function MapRecenterButton({ bottomInset, onPress, isDark }: MapRecenterButtonProps) {
  return (
    <View className="absolute right-4" style={{ bottom: bottomInset }} pointerEvents="box-none">
      <Pressable
        className="w-11 h-11 rounded-full items-center justify-center border"
        style={[
          {
            backgroundColor: isDark ? '#1C2733' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0',
          },
          shadow.lg,
        ]}
        onPress={onPress}
        hitSlop={8}
        accessibilityLabel="Recenter map"
      >
        <Navigation size={20} color={colors.brand.primary} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
