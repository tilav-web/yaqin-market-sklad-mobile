import { Bell } from 'lucide-react-native';
import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { AlarmMode } from '@/stores/alarmSettings';
import { colors } from '@/theme';
import { Section } from './SectionAndField';

interface ShopAlarmSectionProps {
  enabled: boolean;
  mode: AlarmMode;
  onToggleEnabled: (enabled: boolean) => void;
  onSelectMode: (mode: AlarmMode) => void;
  onTestAlarm: () => void;
}

export function ShopAlarmSection({
  enabled,
  mode,
  onToggleEnabled,
  onSelectMode,
  onTestAlarm,
}: ShopAlarmSectionProps) {
  const { tr } = useTranslation();

  return (
    <Section title={tr('shopSet.alarmSection')} icon={Bell}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-text-primary">
          {enabled ? tr('shopSet.alarmOn') : tr('shopSet.alarmOff')}
        </Text>
        <Switch
          value={enabled}
          onValueChange={onToggleEnabled}
          trackColor={{ true: colors.feedback.success }}
          thumbColor={colors.bg.surface}
        />
      </View>
      {enabled ? (
        <>
          <View className="flex-row gap-2 mt-1">
            {(['short', 'long'] as AlarmMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => onSelectMode(m)}
                className={`py-1 px-4 rounded-full border ${
                  mode === m
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-border-subtle bg-bg-canvas'
                }`}
              >
                <Text
                  className={`text-xs ${
                    mode === m ? 'text-brand-primary font-bold' : 'font-semibold text-text-secondary'
                  }`}
                >
                  {m === 'short' ? tr('shopSet.alarmShort') : tr('shopSet.alarmLong')}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-xs text-text-tertiary mt-0.5">
            {mode === 'long' ? tr('shopSet.alarmLongHint') : tr('shopSet.alarmShortHint')}
          </Text>
          <Pressable
            className="self-start py-1 px-4 rounded-xl bg-brand-primary/10 mt-1 active:opacity-75"
            onPress={onTestAlarm}
          >
            <Text className="text-xs font-bold text-brand-primary">{tr('shopSet.alarmTest')}</Text>
          </Pressable>
        </>
      ) : null}
    </Section>
  );
}
