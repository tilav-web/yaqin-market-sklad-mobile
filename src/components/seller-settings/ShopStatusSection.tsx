import { Store } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';
import { Section } from './SectionAndField';

interface ShopStatusSectionProps {
  isOpen: boolean | undefined;
  onToggleOpen: (open: boolean) => void;
}

export function ShopStatusSection({ isOpen, onToggleOpen }: ShopStatusSectionProps) {
  const { tr } = useTranslation();

  return (
    <Section title={tr('shopSet.statusSection')} icon={Store}>
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>{isOpen ? tr('shopSet.open') : tr('shopSet.closed')}</Text>
          <Text style={styles.toggleSub}>
            {isOpen ? tr('shopSet.openSub') : tr('shopSet.closedSub')}
          </Text>
        </View>
        <Switch
          value={isOpen}
          onValueChange={onToggleOpen}
          trackColor={{ true: colors.feedback.success }}
          thumbColor={colors.bg.surface}
        />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  toggleSub: { fontSize: 13, color: colors.text.tertiary, marginTop: 2 },
});
