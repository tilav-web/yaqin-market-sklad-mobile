import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';

export function DeleteAccountWarning() {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: activeColors.feedback.dangerSurface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(232, 57, 46, 0.25)',
        gap: 8,
      }}
    >
      <View className="flex-row items-center gap-2">
        <AlertTriangle size={18} color={activeColors.feedback.danger} strokeWidth={2.2} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: activeColors.feedback.danger }}>
          {tr('deleteAccount.warningTitle')}
        </Text>
      </View>
      <View className="gap-1 pl-1">
        <Text style={{ fontSize: 12, color: activeColors.text.secondary, lineHeight: 16 }}>• {tr('deleteAccount.warning1')}</Text>
        <Text style={{ fontSize: 12, color: activeColors.text.secondary, lineHeight: 16 }}>• {tr('deleteAccount.warning2')}</Text>
        <Text style={{ fontSize: 12, color: activeColors.text.secondary, lineHeight: 16 }}>• {tr('deleteAccount.warning3')}</Text>
      </View>
    </View>
  );
}
