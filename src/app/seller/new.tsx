import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MapPin, Store } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationPickerModal, PickedLocation } from '@/components/LocationPickerModal';
import { ImageUploader } from '@/components/seller/ImageUploader';
import { BankAccountItem, NewShopBankSection } from '@/components/seller/NewShopBankSection';
import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { useEffectiveCoords } from '@/stores/location';
import { colors } from '@/theme';

export default function NewShopScreen() {
  const qc = useQueryClient();
  const coords = useEffectiveCoords();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Bank Account State
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [isAddingNewAccount, setIsAddingNewAccount] = useState(false);
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newMfo, setNewMfo] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccountHolderName, setNewAccountHolderName] = useState('');

  const { data: bankAccounts } = useQuery<BankAccountItem[]>({
    queryKey: ['seller-bank-accounts'],
    queryFn: async () => {
      const res = await api.get<BankAccountItem[]>('/sellers/bank-accounts');
      return res.data;
    },
  });

  const hasSavedAccounts = Boolean(bankAccounts && bankAccounts.length > 0);
  const effectiveBankAccountId =
    selectedBankAccountId ?? (hasSavedAccounts ? (bankAccounts?.find((a) => a.isDefault)?.id || bankAccounts?.[0]?.id || null) : null);
  const showNewAccountForm = isAddingNewAccount || !hasSavedAccounts;

  const formatBankAccount = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 20);
    const groups = raw.match(/.{1,4}/g);
    return groups ? groups.join(' ') : raw;
  };

  const point = picked ?? coords;
  const rawNewAccount = newAccountNumber.replace(/\s+/g, '');
  const rawNewMfo = newMfo.replace(/\s+/g, '');
  const isBankValid = !showNewAccountForm && effectiveBankAccountId
    ? true
    : rawNewAccount.length === 20 && rawNewMfo.length === 5 && newAccountHolderName.trim().length >= 2;

  const create = useMutation({
    mutationFn: async () => {
      if (!point) throw new Error(tr('newShop.pickLocation'));
      const payload: Record<string, unknown> = {
        name: name.trim(),
        address: address.trim(),
        latitude: point.latitude,
        longitude: point.longitude,
        description: description.trim() || undefined,
        photos,
        evidence: picked?.evidence,
      };

      if (!showNewAccountForm && effectiveBankAccountId) {
        payload.bankAccountId = effectiveBankAccountId;
      } else if (rawNewAccount.length === 20) {
        payload.bankAccountNumber = rawNewAccount;
        payload.bankMfo = rawNewMfo;
        payload.bankName = newBankName.trim() || 'Bank';
        payload.bankAccountHolderName = newAccountHolderName.trim();
      }

      const res = await api.post<{ id: string }>('/seller/shops', payload);
      return res.data;
    },
    onSuccess: (shop) => {
      qc.invalidateQueries({ queryKey: ['shops', 'mine'] });
      qc.invalidateQueries({ queryKey: ['seller-bank-accounts'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      router.replace(`/seller/${shop.id}/orders`);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const onPick = (result: PickedLocation) => {
    setPicked(result);
    if (result.address) setAddress(result.address);
    setPickerVisible(false);
  };

  const canSave = !!name.trim() && !!address.trim() && !!point && isBankValid;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center gap-1.5 py-4">
          <View className="w-16 h-16 rounded-full bg-brand-primary-surface items-center justify-center mb-1">
            <Store size={28} color={colors.brand.primary} strokeWidth={2} />
          </View>
          <Text className="text-xl font-bold text-text-primary">{tr('newShop.title')}</Text>
          <Text className="text-sm text-text-secondary text-center">{tr('newShop.desc')}</Text>
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary">{tr('newShop.nameLabel')}</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border-default"
            value={name}
            onChangeText={setName}
            placeholder={tr('newShop.namePh')}
            placeholderTextColor={colors.text.hint}
            maxLength={128}
          />
        </View>

        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary">{tr('newShop.addressLabel')}</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border-default min-h-[64px]"
            value={address}
            onChangeText={setAddress}
            placeholder={tr('newShop.addressPh')}
            placeholderTextColor={colors.text.hint}
            multiline
            textAlignVertical="top"
          />
        </View>

        <Pressable
          className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-brand-primary/30 bg-brand-primary-surface"
          onPress={() => setPickerVisible(true)}
        >
          <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text className="text-sm font-bold text-brand-primary">
            {point ? tr('newShop.changeLocation') : tr('newShop.setLocation')}
          </Text>
        </Pressable>
        {point ? (
          <Text className="text-xs text-text-tertiary text-center -mt-1">
            📍 {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
          </Text>
        ) : null}

        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary">{tr('newShop.descLabel')}</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border-default min-h-[64px]"
            value={description}
            onChangeText={setDescription}
            placeholder={tr('newShop.descPh')}
            placeholderTextColor={colors.text.hint}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Bank Account Selection Section */}
        <NewShopBankSection
          bankAccounts={bankAccounts}
          effectiveBankAccountId={effectiveBankAccountId}
          onSelectBankAccountId={setSelectedBankAccountId}
          isAddingNewAccount={isAddingNewAccount}
          onSetIsAddingNewAccount={setIsAddingNewAccount}
          newAccountNumber={newAccountNumber}
          onChangeNewAccountNumber={setNewAccountNumber}
          newMfo={newMfo}
          onChangeNewMfo={setNewMfo}
          newBankName={newBankName}
          onChangeNewBankName={setNewBankName}
          newAccountHolderName={newAccountHolderName}
          onChangeNewAccountHolderName={setNewAccountHolderName}
          formatBankAccount={formatBankAccount}
        />

        <ImageUploader
          label={tr('newShop.photosLabel')}
          hint={tr('newShop.photosHint')}
          value={photos}
          onChange={setPhotos}
          max={5}
        />
      </ScrollView>

      <View className="px-4 pt-3 pb-2 border-t border-border-subtle bg-surface">
        <Pressable
          className={`h-12 rounded-2xl items-center justify-center ${
            canSave && !create.isPending ? 'bg-brand-primary' : 'bg-border-strong'
          }`}
          disabled={!canSave || create.isPending}
          onPress={() => create.mutate()}
        >
          <Text className="text-base font-bold text-white">
            {create.isPending ? tr('newShop.creating') : tr('newShop.submit')}
          </Text>
        </Pressable>
      </View>

      <LocationPickerModal
        visible={pickerVisible}
        initial={point}
        onCancel={() => setPickerVisible(false)}
        onConfirm={onPick}
      />
    </SafeAreaView>
  );
}
