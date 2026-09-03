import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Building2, Check, Hash, Landmark, MapPin, Plus, Store, User } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { LocationPickerModal, PickedLocation } from '@/components/LocationPickerModal';
import { ImageUploader } from '@/components/seller/ImageUploader';
import { api, extractErrorMessage } from '@/lib/api';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface BankAccountItem {
  id: string;
  accountNumber: string;
  mfo: string;
  bankName: string;
  accountHolderName: string;
  isDefault: boolean;
}

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Store size={28} color={colors.brand.primary} strokeWidth={2} />
          </View>
          <Text style={styles.heroTitle}>{tr('newShop.title')}</Text>
          <Text style={styles.heroDesc}>{tr('newShop.desc')}</Text>
        </View>

        <Field label={tr('newShop.nameLabel')}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={tr('newShop.namePh')}
            placeholderTextColor={colors.text.hint}
            maxLength={128}
          />
        </Field>

        <Field label={tr('newShop.addressLabel')}>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            placeholder={tr('newShop.addressPh')}
            placeholderTextColor={colors.text.hint}
            multiline
          />
        </Field>

        <Pressable style={styles.mapBtn} onPress={() => setPickerVisible(true)}>
          <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.mapBtnText}>
            {point ? tr('newShop.changeLocation') : tr('newShop.setLocation')}
          </Text>
        </Pressable>
        {point ? (
          <Text style={styles.coordHint}>
            📍 {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
          </Text>
        ) : null}

        <Field label={tr('newShop.descLabel')}>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder={tr('newShop.descPh')}
            placeholderTextColor={colors.text.hint}
            multiline
          />
        </Field>

        {/* Bank Account Selection Section */}
        <View style={styles.bankSection}>
          <Text style={styles.bankSectionTitle}>Bank Hisob Raqami (Moliya)</Text>
          <Text style={styles.bankSectionDesc}>
            Ushbu do'kondan tushgan savdo mablag'lari qaysi hisob raqamiga o'tkazilsin?
          </Text>

          {/* List of saved accounts */}
          {hasSavedAccounts && !showNewAccountForm && (
            <View style={styles.accountsList}>
              {bankAccounts?.map((acc) => {
                const isSelected = effectiveBankAccountId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => {
                      setSelectedBankAccountId(acc.id);
                      setIsAddingNewAccount(false);
                    }}
                    style={[styles.accountCard, isSelected && styles.accountCardSelected]}
                  >
                    <View style={[styles.accountRadio, isSelected && styles.accountRadioSelected]}>
                      {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>

                    <View style={styles.accountInfo}>
                      <View style={styles.accountHeaderRow}>
                        <Landmark size={16} color={isSelected ? colors.brand.primary : colors.text.secondary} />
                        <Text style={[styles.accountBankName, isSelected && styles.accountBankNameSelected]}>
                          {acc.bankName || 'Bank'} (MFO: {acc.mfo})
                        </Text>
                      </View>
                      <Text style={styles.accountNumberText}>
                        {formatBankAccount(acc.accountNumber)}
                      </Text>
                      <Text style={styles.accountHolderText} numberOfLines={1}>
                        {acc.accountHolderName}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              <Pressable
                style={styles.addNewAccountBtn}
                onPress={() => {
                  setSelectedBankAccountId(null);
                  setIsAddingNewAccount(true);
                }}
              >
                <Plus size={16} color={colors.brand.primary} strokeWidth={2.4} />
                <Text style={styles.addNewAccountText}>Boshqa yangi hisob raqam qo'shish</Text>
              </Pressable>
            </View>
          )}

          {/* New Account Input Form */}
          {showNewAccountForm && (
            <View style={styles.newAccountForm}>
              {hasSavedAccounts && (
                <Pressable
                  style={styles.cancelNewBtn}
                  onPress={() => {
                    setIsAddingNewAccount(false);
                    setSelectedBankAccountId(null);
                  }}
                >
                  <Text style={styles.cancelNewText}>← Saqlangan hisob raqamlardan tanlash</Text>
                </Pressable>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>
                  20 xonali Bank Hisob Raqami <Text style={styles.star}>*</Text>
                </Text>
                <View style={styles.inputWithIcon}>
                  <Hash size={18} color={colors.text.hint} />
                  <TextInput
                    style={styles.iconInput}
                    value={newAccountNumber}
                    onChangeText={(t) => setNewAccountNumber(formatBankAccount(t))}
                    placeholder="2020 8000 0000 0000 0001"
                    placeholderTextColor={colors.text.hint}
                    keyboardType="number-pad"
                    maxLength={24}
                  />
                </View>
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>
                    MFO <Text style={styles.star}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <Building2 size={18} color={colors.text.hint} />
                    <TextInput
                      style={styles.iconInput}
                      value={newMfo}
                      onChangeText={(t) => setNewMfo(t.replace(/\D/g, '').slice(0, 5))}
                      placeholder="00444"
                      placeholderTextColor={colors.text.hint}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                </View>

                <View style={[styles.field, { flex: 1.5 }]}>
                  <Text style={styles.label}>Bank filiali nomi</Text>
                  <TextInput
                    style={styles.input}
                    value={newBankName}
                    onChangeText={setNewBankName}
                    placeholder="Masalan: AT Xalq Banki"
                    placeholderTextColor={colors.text.hint}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Hisob egasi / Korxona nomi <Text style={styles.star}>*</Text>
                </Text>
                <View style={styles.inputWithIcon}>
                  <User size={18} color={colors.text.hint} />
                  <TextInput
                    style={styles.iconInput}
                    value={newAccountHolderName}
                    onChangeText={setNewAccountHolderName}
                    placeholder="Masalan: ООО BIZNES yoki YaTT"
                    placeholderTextColor={colors.text.hint}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        <ImageUploader
          label={tr('newShop.photosLabel')}
          hint={tr('newShop.photosHint')}
          value={photos}
          onChange={setPhotos}
          max={5}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          disabled={!canSave || create.isPending}
          onPress={() => create.mutate()}>
          <Text style={styles.saveText}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroTitle: { ...typography.h3, color: colors.text.primary },
  heroDesc: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center' },
  field: { gap: spacing.xs },
  label: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary },
  star: { color: '#EF4444' },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
  },
  mapBtnText: { ...typography.body, fontWeight: '700', color: colors.brand.primary },
  coordHint: { ...typography.caption, color: colors.text.tertiary },

  // Bank Section Styles
  bankSection: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.sm,
  },
  bankSectionTitle: { ...typography.body, fontWeight: '700', color: colors.text.primary },
  bankSectionDesc: { ...typography.caption, color: colors.text.secondary },
  accountsList: { gap: spacing.sm, marginTop: spacing.xs },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg.canvas,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
  accountCardSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
  },
  accountRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRadioSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary,
  },
  accountInfo: { flex: 1, gap: 2 },
  accountHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  accountBankName: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  accountBankNameSelected: { color: colors.brand.primary },
  accountNumberText: { ...typography.body, fontWeight: '700', color: colors.text.primary, letterSpacing: 0.5 },
  accountHolderText: { ...typography.caption, color: colors.text.tertiary },
  addNewAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.bg.canvas,
  },
  addNewAccountText: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
  newAccountForm: { gap: spacing.sm, marginTop: spacing.xs },
  cancelNewBtn: { paddingVertical: spacing.xs },
  cancelNewText: { ...typography.caption, fontWeight: '600', color: colors.brand.primary },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconInput: {
    flex: 1,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
  },
  rowFields: { flexDirection: 'row', gap: spacing.sm },

  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  saveBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
