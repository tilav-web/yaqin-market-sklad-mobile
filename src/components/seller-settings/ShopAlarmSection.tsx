import { Bell } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { AlarmMode } from '@/stores/alarmSettings';
import { colors, radius, spacing, typography } from '@/theme';
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
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
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
          <View style={styles.chipRow}>
            {(['short', 'long'] as AlarmMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => onSelectMode(m)}
                style={[styles.chip, mode === m && styles.chipActive]}
              >
                <Text style={[styles.chipText, mode === m && styles.chipTextActive]}>
                  {m === 'short' ? tr('shopSet.alarmShort') : tr('shopSet.alarmLong')}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            {mode === 'long' ? tr('shopSet.alarmLongHint') : tr('shopSet.alarmShortHint')}
          </Text>
          <Pressable style={styles.testBtn} onPress={onTestAlarm}>
            <Text style={styles.testText}>{tr('shopSet.alarmTest')}</Text>
          </Pressable>
        </>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.canvas,
  },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  chipText: { ...typography.caption, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: colors.brand.primary, fontWeight: '700' },
  hint: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  testBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
    marginTop: spacing.xs,
  },
  testText: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
});
