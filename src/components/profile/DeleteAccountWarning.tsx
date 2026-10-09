import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

export function DeleteAccountWarning() {
  const { tr } = useTranslation();

  return (
    <View className="bg-red-500/10 rounded-2xl p-4 border border-feedback-danger/20 gap-2">
      <View className="flex-row items-center gap-2">
        <AlertTriangle size={18} color={colors.feedback.danger} strokeWidth={2.2} />
        <Text className="text-sm font-bold text-text-danger">{tr('deleteAccount.warningTitle')}</Text>
      </View>
      <View className="gap-1 pl-1">
        <Text className="text-xs text-text-secondary leading-4">• {tr('deleteAccount.warning1')}</Text>
        <Text className="text-xs text-text-secondary leading-4">• {tr('deleteAccount.warning2')}</Text>
        <Text className="text-xs text-text-secondary leading-4">• {tr('deleteAccount.warning3')}</Text>
      </View>
    </View>
  );
}
