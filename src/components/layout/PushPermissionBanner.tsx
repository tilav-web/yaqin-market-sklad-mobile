import { BellOff, X } from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { usePushPermissionStore } from '@/stores/pushPermission';
import { colors } from '@/theme';

export function PushPermissionBanner() {
  const { tr } = useTranslation();
  const dismiss = usePushPermissionStore((s) => s.dismiss);

  return (
    <View className="flex-row items-center gap-2 bg-amber-500/10 rounded-2xl px-3.5 py-2.5 border border-feedback-warning/40 w-full shadow-lg">
      <BellOff size={16} color={colors.feedback.warning} strokeWidth={2.4} />
      <Text className="flex-1 text-feedback-warning text-xs font-semibold leading-4">
        {tr('push.disabled')}
      </Text>
      <Pressable onPress={() => void Linking.openSettings()} hitSlop={8}>
        <Text className="text-brand-primary text-xs font-bold">{tr('imgUp.openSettings')}</Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={8} className="p-1">
        <X size={16} color={colors.feedback.warning} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
