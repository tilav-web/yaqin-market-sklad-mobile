import { CreditCard } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface SellerWithdrawFormProps {
  amount: string;
  onChangeAmount: (val: string) => void;
  cardNum: string;
  onChangeCardNum: (val: string) => void;
  cardName: string;
  onChangeCardName: (val: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function SellerWithdrawForm({
  amount,
  onChangeAmount,
  cardNum,
  onChangeCardNum,
  cardName,
  onChangeCardName,
  onSubmit,
  isPending,
}: SellerWithdrawFormProps) {
  const { tr } = useTranslation();

  return (
    <View className="bg-surface rounded-2xl p-4 gap-3 border border-border-subtle shadow-sm">
      <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider">
        {tr('balance.withdrawTitle')}
      </Text>
      <TextInput
        className="border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary bg-canvas"
        placeholder={tr('balance.amountPlaceholder')}
        keyboardType="numeric"
        value={amount}
        onChangeText={onChangeAmount}
        placeholderTextColor={colors.text.tertiary}
      />
      <TextInput
        className="border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary bg-canvas"
        placeholder={tr('balance.cardNumber')}
        keyboardType="numeric"
        value={cardNum}
        onChangeText={onChangeCardNum}
        placeholderTextColor={colors.text.tertiary}
      />
      <TextInput
        className="border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary bg-canvas"
        placeholder={tr('balance.cardHolder')}
        value={cardName}
        onChangeText={onChangeCardName}
        placeholderTextColor={colors.text.tertiary}
      />
      <Pressable
        className={`flex-row items-center justify-center gap-2 bg-brand-primary rounded-xl h-12 mt-1 active:opacity-90 ${
          isPending ? 'opacity-60' : ''
        }`}
        disabled={isPending}
        onPress={onSubmit}
      >
        <CreditCard size={18} color="#fff" />
        <Text className="text-sm font-bold text-white">{tr('balance.submitRequest')}</Text>
      </Pressable>
    </View>
  );
}
