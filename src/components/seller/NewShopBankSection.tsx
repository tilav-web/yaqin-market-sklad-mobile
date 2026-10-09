import { Building2, Check, Hash, Landmark, Plus, User } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme';

export interface BankAccountItem {
  id: string;
  accountNumber: string;
  mfo: string;
  bankName: string;
  accountHolderName: string;
  isDefault: boolean;
}

interface NewShopBankSectionProps {
  bankAccounts?: BankAccountItem[];
  effectiveBankAccountId: string | null;
  onSelectBankAccountId: (id: string | null) => void;
  isAddingNewAccount: boolean;
  onSetIsAddingNewAccount: (adding: boolean) => void;
  newAccountNumber: string;
  onChangeNewAccountNumber: (val: string) => void;
  newMfo: string;
  onChangeNewMfo: (val: string) => void;
  newBankName: string;
  onChangeNewBankName: (val: string) => void;
  newAccountHolderName: string;
  onChangeNewAccountHolderName: (val: string) => void;
  formatBankAccount: (text: string) => string;
}

export function NewShopBankSection({
  bankAccounts,
  effectiveBankAccountId,
  onSelectBankAccountId,
  isAddingNewAccount,
  onSetIsAddingNewAccount,
  newAccountNumber,
  onChangeNewAccountNumber,
  newMfo,
  onChangeNewMfo,
  newBankName,
  onChangeNewBankName,
  newAccountHolderName,
  onChangeNewAccountHolderName,
  formatBankAccount,
}: NewShopBankSectionProps) {
  const hasSavedAccounts = Boolean(bankAccounts && bankAccounts.length > 0);
  const showNewAccountForm = isAddingNewAccount || !hasSavedAccounts;

  return (
    <View className="mt-2.5 p-4 bg-surface rounded-2xl border border-border-subtle gap-3">
      <Text className="text-base font-bold text-text-primary">Bank Hisob Raqami (Moliya)</Text>
      <Text className="text-xs text-text-secondary -mt-1 leading-4">
        Ushbu do'kondan tushgan savdo mablag'lari qaysi hisob raqamiga o'tkazilsin?
      </Text>

      {/* List of saved accounts */}
      {hasSavedAccounts && !showNewAccountForm && (
        <View className="gap-2.5">
          {bankAccounts?.map((acc) => {
            const isSelected = effectiveBankAccountId === acc.id;
            return (
              <Pressable
                key={acc.id}
                onPress={() => {
                  onSelectBankAccountId(acc.id);
                  onSetIsAddingNewAccount(false);
                }}
                className={`flex-row p-3.5 rounded-xl border items-center gap-3 ${
                  isSelected ? 'bg-brand-primary-surface border-brand-primary' : 'bg-surface-muted border-border-subtle'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'border-brand-primary bg-brand-primary' : 'border-border-default bg-surface'
                  }`}
                >
                  {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                </View>

                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-1.5">
                    <Landmark size={14} color={isSelected ? colors.brand.primary : colors.text.secondary} />
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-brand-primary' : 'text-text-primary'
                      }`}
                    >
                      {acc.bankName || 'Bank'} (MFO: {acc.mfo})
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-text-primary font-mono tracking-wider">
                    {formatBankAccount(acc.accountNumber)}
                  </Text>
                  <Text className="text-xs text-text-secondary" numberOfLines={1}>
                    {acc.accountHolderName}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <Pressable
            className="flex-row items-center justify-center gap-2 py-3 border border-dashed border-brand-primary rounded-xl mt-1"
            onPress={() => {
              onSelectBankAccountId(null);
              onSetIsAddingNewAccount(true);
            }}
          >
            <Plus size={16} color={colors.brand.primary} strokeWidth={2.4} />
            <Text className="text-sm font-bold text-brand-primary">Boshqa yangi hisob raqam qo'shish</Text>
          </Pressable>
        </View>
      )}

      {/* New Account Input Form */}
      {showNewAccountForm && (
        <View className="gap-3">
          {hasSavedAccounts && (
            <Pressable
              className="py-1"
              onPress={() => {
                onSetIsAddingNewAccount(false);
                onSelectBankAccountId(null);
              }}
            >
              <Text className="text-xs font-semibold text-brand-primary">← Saqlangan hisob raqamlardan tanlash</Text>
            </Pressable>
          )}

          <View className="gap-1.5">
            <Text className="text-xs font-bold text-text-primary">
              20 xonali Bank Hisob Raqami <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-surface border border-border-default rounded-xl px-3 h-12 gap-2.5">
              <Hash size={18} color={colors.text.hint} />
              <TextInput
                className="flex-1 text-sm text-text-primary font-mono"
                value={newAccountNumber}
                onChangeText={(t) => onChangeNewAccountNumber(formatBankAccount(t))}
                placeholder="2020 8000 0000 0000 0001"
                placeholderTextColor={colors.text.hint}
                keyboardType="number-pad"
                maxLength={24}
              />
            </View>
          </View>

          <View className="flex-row gap-2.5">
            <View className="flex-1 gap-1.5">
              <Text className="text-xs font-bold text-text-primary">
                MFO <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row items-center bg-surface border border-border-default rounded-xl px-3 h-12 gap-2">
                <Building2 size={16} color={colors.text.hint} />
                <TextInput
                  className="flex-1 text-sm text-text-primary font-mono"
                  value={newMfo}
                  onChangeText={(t) => onChangeNewMfo(t.replace(/\D/g, '').slice(0, 5))}
                  placeholder="00444"
                  placeholderTextColor={colors.text.hint}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>

            <View className="flex-[1.5] gap-1.5">
              <Text className="text-xs font-bold text-text-primary">Bank filiali nomi</Text>
              <TextInput
                className="bg-surface border border-border-default rounded-xl px-3 h-12 text-sm text-text-primary"
                value={newBankName}
                onChangeText={onChangeNewBankName}
                placeholder="Masalan: AT Xalq Banki"
                placeholderTextColor={colors.text.hint}
              />
            </View>
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-bold text-text-primary">
              Hisob egasi / Korxona nomi <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-surface border border-border-default rounded-xl px-3 h-12 gap-2.5">
              <User size={18} color={colors.text.hint} />
              <TextInput
                className="flex-1 text-sm text-text-primary"
                value={newAccountHolderName}
                onChangeText={onChangeNewAccountHolderName}
                placeholder="Masalan: ООО BIZNES yoki YaTT"
                placeholderTextColor={colors.text.hint}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
