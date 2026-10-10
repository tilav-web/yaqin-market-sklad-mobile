import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

export const REASON_KEYS = [
  'bad_experience',
  'no_nearby_shops',
  'app_bugs',
  'created_another_account',
  'privacy_concern',
  'other',
] as const;

export type ReasonKey = (typeof REASON_KEYS)[number];

interface DeleteAccountReasonsProps {
  readonly selectedReason: ReasonKey | null;
  readonly onSelectReason: (key: ReasonKey) => void;
}

export function DeleteAccountReasons({
  selectedReason,
  onSelectReason,
}: DeleteAccountReasonsProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <View className="gap-2">
      <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {tr('deleteAccount.reasonLabel')}
      </Text>
      <View className="gap-2">
        {REASON_KEYS.map((key) => {
          const isSelected = selectedReason === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                haptics.selection();
                onSelectReason(key);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isSelected ? activeColors.brand.primary : activeColors.border.subtle,
                backgroundColor: isSelected ? activeColors.brand.primarySurface : activeColors.bg.surface,
              }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: isSelected ? activeColors.brand.primary : activeColors.border.default,
                }}>
                {isSelected && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: activeColors.brand.primary,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? activeColors.text.primary : activeColors.text.secondary,
                }}>
                {tr(`deleteAccount.reason.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
