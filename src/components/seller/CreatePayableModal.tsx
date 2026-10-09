import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { DatePickerModal } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { PAYABLE_CATEGORY_LABEL_KEYS, PAYABLE_CATEGORY_LIST } from '@/lib/payableCategories';
import { PayableAccount, PayableCategory } from '@/lib/types';
import { colors } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  /** Existing creditors to pick from, so the same supplier isn't re-created each time. */
  readonly accounts: PayableAccount[];
  /** When opened from a specific account (e.g. "qarz qo'shish" inside its history), skip the picker. */
  readonly presetAccountId?: string | null;
  readonly presetAccountName?: string;
  readonly onClose: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function CreatePayableModal({ visible, shopId, accounts, presetAccountId, presetAccountName, onClose }: Props) {
  const qc = useQueryClient();
  const { tr } = useTranslation();
  const hasAccounts = accounts.length > 0;
  const [mode, setMode] = useState<'existing' | 'new'>(hasAccounts ? 'existing' : 'new');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<PayableCategory | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const isPreset = !!presetAccountId;

  const syncKey = `${visible}|${presetAccountId ?? ''}|${hasAccounts}`;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (syncedKey !== syncKey) {
    setSyncedKey(syncKey);
    if (visible) {
      if (presetAccountId) {
        setMode('existing');
        setSelectedId(presetAccountId);
      } else {
        setMode(hasAccounts ? 'existing' : 'new');
        setSelectedId(null);
      }
    }
  }

  const reset = () => {
    setSelectedId(null);
    setNewName('');
    setNewCategory(null);
    setNewPhone('');
    setAmount('');
    setDescription('');
    setDueDate('');
    setNote('');
  };

  const save = useMutation({
    mutationFn: async () => {
      let accountId = selectedId;
      if (mode === 'new') {
        const res = await api.post<{ id: string }>(`/seller/shops/${shopId}/payables/accounts`, {
          name: newName.trim(),
          category: newCategory,
          phone: newPhone.trim() || undefined,
        });
        accountId = res.data.id;
      }
      await api.post(`/seller/shops/${shopId}/payables/charges`, {
        accountId,
        amount: parseAmount(amount),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables', shopId] });
      qc.invalidateQueries({ queryKey: ['payable-account', shopId] });
      reset();
      onClose();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const validAccount = mode === 'existing' ? !!selectedId : newName.trim().length > 0 && !!newCategory;
  const canSave = validAccount && parseAmount(amount) > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Text className="text-xl font-bold text-text-primary">{tr('payable.title')}</Text>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {isPreset ? (
              <Field label={tr('payable.creditor')}>
                <View className="bg-brand-primary/10 rounded-xl px-4 py-3">
                  <Text className="text-base font-bold text-brand-primary">{presetAccountName}</Text>
                </View>
              </Field>
            ) : (
              <>
                {hasAccounts ? (
                  <View className="flex-row gap-2">
                    <Pressable
                      className={`flex-1 items-center py-2.5 rounded-xl border ${
                        mode === 'existing' ? 'bg-brand-primary border-brand-primary' : 'border-border'
                      }`}
                      onPress={() => setMode('existing')}>
                      <Text className={`text-xs font-bold ${mode === 'existing' ? 'text-white' : 'text-text-secondary'}`}>
                        {tr('payable.existing')}
                      </Text>
                    </Pressable>
                    <Pressable
                      className={`flex-1 items-center py-2.5 rounded-xl border ${
                        mode === 'new' ? 'bg-brand-primary border-brand-primary' : 'border-border'
                      }`}
                      onPress={() => setMode('new')}>
                      <Text className={`text-xs font-bold ${mode === 'new' ? 'text-white' : 'text-text-secondary'}`}>
                        {tr('payable.new')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {mode === 'existing' ? (
                  <Field label={tr('payable.selectCreditor')}>
                    <View className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                      {accounts.map((a) => (
                        <Pressable
                          key={a.id}
                          className="flex-row items-center gap-3 p-3 border-b border-border-subtle"
                          onPress={() => setSelectedId(a.id)}>
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                              {a.name}
                            </Text>
                            <Text className="text-xs text-text-secondary mt-0.5">{tr(PAYABLE_CATEGORY_LABEL_KEYS[a.category])}</Text>
                          </View>
                          {selectedId === a.id ? (
                            <Check size={18} color={colors.brand.primary} strokeWidth={2.6} />
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  </Field>
                ) : (
                  <>
                    <Field label={tr('payable.creditorName')}>
                      <TextInput
                        className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                        value={newName}
                        onChangeText={setNewName}
                        placeholder={tr('payable.creditorNamePlaceholder')}
                        placeholderTextColor={colors.text.hint}
                      />
                    </Field>
                    <Field label={tr('payable.category')}>
                      <View className="flex-row flex-wrap gap-2">
                        {PAYABLE_CATEGORY_LIST.map((c) => (
                          <Pressable
                            key={c}
                            className={`px-3 py-1.5 rounded-full border ${
                              newCategory === c ? 'bg-brand-primary border-brand-primary' : 'border-border'
                            }`}
                            onPress={() => setNewCategory(c)}>
                            <Text
                              className={`text-xs font-bold ${
                                newCategory === c ? 'text-white' : 'text-text-secondary'
                              }`}>
                              {tr(PAYABLE_CATEGORY_LABEL_KEYS[c])}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </Field>
                    <Field label={tr('payable.phone')}>
                      <TextInput
                        className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                        value={newPhone}
                        onChangeText={setNewPhone}
                        keyboardType="phone-pad"
                        placeholder="+998901234567"
                        placeholderTextColor={colors.text.hint}
                      />
                    </Field>
                  </>
                )}
              </>
            )}

            <Field label={tr('payable.amount')}>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder={tr('payable.amountPlaceholder')}
                placeholderTextColor={colors.text.hint}
              />
            </Field>
            <Field label={tr('payable.description')}>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                value={description}
                onChangeText={setDescription}
                placeholder={tr('payable.descPlaceholder')}
                placeholderTextColor={colors.text.hint}
              />
            </Field>
            <Field label={tr('payable.dueDateOptional')}>
              <Pressable
                className="flex-row items-center gap-2 bg-surface rounded-xl px-4 py-3 border border-border"
                onPress={() => setDatePickerOpen(true)}>
                <CalendarDays size={16} color={colors.brand.primary} strokeWidth={2.2} />
                <Text className={`text-base ${dueDate ? 'text-text-primary' : 'text-text-hint'}`}>
                  {dueDate || tr('payable.pickDate')}
                </Text>
              </Pressable>
            </Field>
            <Field label={tr('payable.note')}>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border min-h-[56px]"
                value={note}
                onChangeText={setNote}
                placeholder={tr('payable.notePlaceholder')}
                placeholderTextColor={colors.text.hint}
                multiline
                textAlignVertical="top"
              />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View className="px-4 py-3 border-t border-border-subtle bg-surface gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-text-secondary">{tr('payable.totalDebt')}</Text>
            <Text className="text-xl font-bold text-brand-primary">
              {fmt(parseAmount(amount))} {tr('common.som')}
            </Text>
          </View>
          <Pressable
            className={`h-12 rounded-xl items-center justify-center ${canSave && !save.isPending ? 'bg-brand-primary' : 'bg-surface-disabled'}`}
            disabled={!canSave || save.isPending}
            onPress={() => save.mutate()}>
            <Text className="text-base font-bold text-white">
              {save.isPending ? tr('payable.saving') : tr('payable.submit')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <DatePickerModal
        visible={datePickerOpen}
        value={dueDate}
        title={tr('payable.dueDate')}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(iso) => {
          setDueDate(iso);
          setDatePickerOpen(false);
        }}
      />
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{label}</Text>
      {children}
    </View>
  );
}
