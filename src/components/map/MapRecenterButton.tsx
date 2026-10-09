import { Navigation } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, shadow } from '@/theme';

interface MapRecenterButtonProps {
  bottomInset: number;
  onPress: () => void;
  isDark: boolean;
}

export function MapRecenterButton({ bottomInset, onPress, isDark }: MapRecenterButtonProps) {
  return (
    <View style={[styles.recenterWrap, { bottom: bottomInset }]} pointerEvents="box-none">
      <Pressable
        style={[styles.recenterBtn, isDark && styles.recenterBtnDark]}
        onPress={onPress}
        hitSlop={8}
        accessibilityLabel="Recenter map"
      >
        <Navigation size={20} color={colors.brand.primary} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recenterWrap: {
    position: 'absolute',
    right: layout.screenPadding,
  },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.lg,
  },
  recenterBtnDark: {
    backgroundColor: '#1C2733',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});
