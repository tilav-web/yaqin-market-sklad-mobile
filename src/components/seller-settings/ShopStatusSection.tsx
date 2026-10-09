import { Store } from 'lucide-react-native';
import React from 'react';
import { Switch, Text, View } from 'react-native';

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
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
            {isOpen ? tr('shopSet.open') : tr('shopSet.closed')}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.text.tertiary }}>
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
