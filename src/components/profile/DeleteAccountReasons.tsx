import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
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

  return (
    <View className="gap-2">
      <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">
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
              className={`flex-row items-center gap-3 p-3.5 rounded-xl border ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-border-subtle bg-surface'
              }`}>
              <View
                className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                  isSelected ? 'border-brand-primary' : 'border-border'
                }`}>
                {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
              </View>
              <Text
                className={`text-sm ${
                  isSelected ? 'font-bold text-text-primary' : 'text-text-secondary'
                }`}>
                {tr(`deleteAccount.reason.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
