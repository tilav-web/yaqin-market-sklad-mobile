import { ArrowLeft, Save } from 'lucide-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, shadow } from '@/theme';

interface DeliveryZonesTopNavProps {
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function DeliveryZonesTopNav({ onBack, onSave, isSaving }: DeliveryZonesTopNavProps) {
  return (
    <SafeAreaView
      className="absolute top-0 inset-x-0 flex-row justify-between px-2 pb-2"
      edges={['top']}
      pointerEvents="box-none"
    >
      <Pressable
        className="w-9 h-9 rounded-full items-center justify-center bg-white/95"
        style={shadow.sm}
        onPress={onBack}
        hitSlop={8}
      >
        <ArrowLeft size={18} color={colors.text.primary} />
      </Pressable>
      <Pressable
        className="w-9 h-9 rounded-full items-center justify-center bg-white/95"
        style={[shadow.sm, isSaving && { opacity: 0.5 }]}
        onPress={onSave}
        disabled={isSaving}
      >
        <Save size={18} color={colors.brand.primary} />
      </Pressable>
    </SafeAreaView>
  );
}
