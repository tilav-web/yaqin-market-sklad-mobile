import { Building2, Hash, Landmark, User } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

import { StirData } from './types';

interface SellerAppStep3BankProps {
  bankAccountNumber: string;
  bankMfo: string;
  bankName: string;
  bankAccountHolderName: string;
  contactPhone: string;
  companyName: string;
  stirData: StirData | null;
  cleanStir: string;
  commissionRate: number;
  onBankAccountNumberChange: (text: string) => void;
  onBankMfoChange: (text: string) => void;
  onBankNameChange: (text: string) => void;
  onBankAccountHolderNameChange: (text: string) => void;
  onContactPhoneChange: (text: string) => void;
}

export function SellerAppStep3Bank({
  bankAccountNumber,
  bankMfo,
  bankName,
  bankAccountHolderName,
  contactPhone,
  companyName,
  stirData,
  cleanStir,
  commissionRate,
  onBankAccountNumberChange,
  onBankMfoChange,
  onBankNameChange,
  onBankAccountHolderNameChange,
  onContactPhoneChange,
}: SellerAppStep3BankProps) {
  const { tr } = useTranslation();

  return (
    <View className="gap-4">
      {/* Virtual Bank Account Mockup */}
      <View className="bg-stone-900 rounded-3xl p-5 min-h-[195px] justify-between border border-stone-700 shadow-md">
        <View className="flex-row justify-between items-center">
          <View className="w-10 h-10 rounded-xl bg-stone-700 items-center justify-center">
            <Landmark size={22} color="#ffffff" strokeWidth={2.2} />
          </View>
          <View className="bg-white/10 px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-white">
              {bankMfo ? `MFO: ${bankMfo}` : tr('sellerApp.bankCardTitle')}
            </Text>
          </View>
        </View>

        <Text className="text-2xl font-black text-white tracking-widest my-2" numberOfLines={1}>
          {bankAccountNumber ? bankAccountNumber : '2020 8000 •••• •••• ••••'}
        </Text>

        <View className="flex-row justify-between items-end">
          <View className="flex-1 mr-3">
            <Text className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              {tr('sellerApp.bankAccountHolder')}
            </Text>
            <Text className="text-sm font-extrabold text-white mt-0.5" numberOfLines={1}>
              {bankAccountHolderName || companyName || 'KORXONA NOMI'}
            </Text>
          </View>
          <View className="bg-feedback-success/20 px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-feedback-success">{tr('sellerApp.zeroCommission')}</Text>
          </View>
        </View>
      </View>

      {/* Bank Account Inputs Form */}
      <View className="bg-bg-surface rounded-3xl p-5 border border-border-subtle gap-3.5 shadow-sm">
        <Text className="text-base font-extrabold text-text-primary">{tr('sellerApp.bankDetailsTitle')}</Text>
        <Text className="text-xs text-text-secondary leading-4">{tr('sellerApp.bankDetailsDesc')}</Text>

        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-secondary">
            {tr('sellerApp.bankAccountLabel')} <Text className="text-feedback-danger font-black">*</Text>
          </Text>
          <View className="flex-row items-center gap-2 bg-bg-canvas rounded-xl px-3 py-2.5 border border-border-default">
            <Hash size={18} color={colors.text.hint} />
            <TextInput
              className="flex-1 text-sm font-bold text-text-primary"
              value={bankAccountNumber}
              onChangeText={onBankAccountNumberChange}
              placeholder="2020 8000 0000 0000 0001"
              placeholderTextColor={colors.text.hint}
              keyboardType="number-pad"
              maxLength={24}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Text className="text-xs font-bold text-text-secondary">
              {tr('sellerApp.bankMfoLabel')} <Text className="text-feedback-danger font-black">*</Text>
            </Text>
            <View className="flex-row items-center gap-2 bg-bg-canvas rounded-xl px-3 py-2.5 border border-border-default">
              <Building2 size={18} color={colors.text.hint} />
              <TextInput
                className="flex-1 text-sm font-bold text-text-primary"
                value={bankMfo}
                onChangeText={onBankMfoChange}
                placeholder="00444"
                placeholderTextColor={colors.text.hint}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>

          <View className="flex-[1.5] gap-1.5">
            <Text className="text-xs font-bold text-text-secondary">{tr('sellerApp.bankNameLabel')}</Text>
            <TextInput
              className="bg-bg-canvas rounded-xl px-3 py-2.5 border border-border-default text-sm font-bold text-text-primary"
              value={bankName}
              onChangeText={onBankNameChange}
              placeholder={tr('sellerApp.bankNamePlaceholder')}
              placeholderTextColor={colors.text.hint}
            />
          </View>
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-secondary">
            {tr('sellerApp.accountHolderInputLabel')} <Text className="text-feedback-danger font-black">*</Text>
          </Text>
          <View className="flex-row items-center gap-2 bg-bg-canvas rounded-xl px-3 py-2.5 border border-border-default">
            <User size={18} color={colors.text.hint} />
            <TextInput
              className="flex-1 text-sm font-bold text-text-primary"
              value={bankAccountHolderName}
              onChangeText={onBankAccountHolderNameChange}
              placeholder={companyName || tr('sellerApp.accountHolderPlaceholder')}
              placeholderTextColor={colors.text.hint}
            />
          </View>
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-secondary">{tr('sellerApp.contactPhoneLabel')}</Text>
          <TextInput
            className="bg-bg-canvas rounded-xl px-3 py-2.5 border border-border-default text-sm font-bold text-text-primary"
            value={contactPhone}
            onChangeText={onContactPhoneChange}
            placeholder="+998 90 123 45 67"
            placeholderTextColor={colors.text.hint}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Summary Receipt Card */}
      <View className="bg-bg-surface rounded-3xl p-5 border border-border-subtle gap-2.5 shadow-sm">
        <Text className="text-sm font-extrabold text-text-primary mb-1">{tr('sellerApp.summaryTitle')}</Text>

        <View className="flex-row justify-between items-center py-1 border-b border-border-subtle">
          <Text className="text-xs text-text-secondary">{tr('sellerApp.summaryOrg')}</Text>
          <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
            {companyName || stirData?.companyName || '—'}
          </Text>
        </View>

        <View className="flex-row justify-between items-center py-1 border-b border-border-subtle">
          <Text className="text-xs text-text-secondary">{tr('sellerApp.summaryStir')}</Text>
          <Text className="text-xs font-bold text-text-primary">{cleanStir}</Text>
        </View>

        <View className="flex-row justify-between items-center py-1 border-b border-border-subtle">
          <Text className="text-xs text-text-secondary">{tr('sellerApp.summaryAccount')}</Text>
          <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
            {bankAccountNumber ? `${bankAccountNumber.slice(0, 10)}...` : '—'}
          </Text>
        </View>

        <View className="flex-row justify-between items-center py-1 border-b border-border-subtle">
          <Text className="text-xs text-text-secondary">{tr('sellerApp.summaryMfo')}</Text>
          <Text className="text-xs font-bold text-text-primary">{bankMfo || '—'}</Text>
        </View>

        <View className="flex-row justify-between items-center py-1 border-b border-border-subtle">
          <Text className="text-xs text-text-secondary">{tr('sellerApp.summarySoliq')}</Text>
          <Text className="text-xs font-bold text-feedback-success">{tr('sellerApp.summaryAttached')}</Text>
        </View>

        <View className="flex-row justify-between items-center py-1">
          <Text className="text-xs text-text-secondary">{tr('sellerApp.summaryComm')}</Text>
          <Text className="text-xs font-bold text-text-primary">
            {tr('sellerApp.summaryCommRate', { rate: commissionRate })}
          </Text>
        </View>
      </View>
    </View>
  );
}
