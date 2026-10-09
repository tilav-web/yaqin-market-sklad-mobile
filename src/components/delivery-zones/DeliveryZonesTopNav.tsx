import { ArrowLeft, Save } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing } from '@/theme';

interface DeliveryZonesTopNavProps {
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function DeliveryZonesTopNav({ onBack, onSave, isSaving }: DeliveryZonesTopNavProps) {
  return (
    <SafeAreaView style={styles.topControls} edges={['top']} pointerEvents="box-none">
      <Pressable style={styles.floatBtn} onPress={onBack} hitSlop={8}>
        <ArrowLeft size={18} color={colors.text.primary} />
      </Pressable>
      <Pressable
        style={[styles.floatBtn, isSaving && { opacity: 0.5 }]}
        onPress={onSave}
        disabled={isSaving}
      >
        <Save size={18} color={colors.brand.primary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  floatBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...shadow.sm,
  },
});
