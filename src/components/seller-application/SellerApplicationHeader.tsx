import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface SellerApplicationHeaderProps {
  step: 1 | 2 | 3;
  onBack: () => void;
}

export function SellerApplicationHeader({ step, onBack }: SellerApplicationHeaderProps) {
  const { tr } = useTranslation();

  return (
    <>
      <View className="flex-row items-center justify-between px-5 py-3.5 bg-bg-surface border-b border-border-subtle">
        <Pressable
          onPress={onBack}
          className="w-9 h-9 rounded-full bg-bg-surface-muted items-center justify-center border border-border-subtle active:opacity-75"
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.4} />
        </Pressable>

        <View className="items-center">
          <Text className="text-base font-extrabold text-text-primary">{tr('sellerApp.headerTitle')}</Text>
          <Text className="text-xs font-semibold text-brand-primary mt-0.5">
            {step === 1 && tr('sellerApp.step1Badge')}
            {step === 2 && tr('sellerApp.step2Badge')}
            {step === 3 && tr('sellerApp.step3Badge')}
          </Text>
        </View>

        <View className="px-2.5 py-1 rounded-full bg-brand-primary/10">
          <Text className="text-xs font-extrabold text-brand-primary">{step}/3</Text>
        </View>
      </View>

      <View className="bg-bg-surface px-5 pt-1 pb-3 border-b border-border-subtle">
        <View className="flex-row gap-1.5 mb-1.5">
          <View className="flex-1 h-1 rounded-full bg-brand-primary" />
          <View className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-brand-primary' : 'bg-border-default'}`} />
          <View className={`flex-1 h-1 rounded-full ${step >= 3 ? 'bg-brand-primary' : 'bg-border-default'}`} />
        </View>
        <View className="flex-row justify-between">
          <Text className={`text-[11px] ${step === 1 ? 'font-bold text-text-primary' : 'font-semibold text-text-hint'}`}>
            {tr('sellerApp.tab1')}
          </Text>
          <Text className={`text-[11px] ${step === 2 ? 'font-bold text-text-primary' : 'font-semibold text-text-hint'}`}>
            {tr('sellerApp.tab2')}
          </Text>
          <Text className={`text-[11px] ${step === 3 ? 'font-bold text-text-primary' : 'font-semibold text-text-hint'}`}>
            {tr('sellerApp.tab3')}
          </Text>
        </View>
      </View>
    </>
  );
}
