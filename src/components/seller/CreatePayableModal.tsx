import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { DatePickerModal } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { PAYABLE_CATEGORY_LABELS, PAYABLE_CATEGORY_LIST } from '@/lib/payableCategories';
import { PayableAccount, PayableCategory } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

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

  // Re-sync when the modal opens (preset account, or default picker mode).
  useEffect(() => {
    if (!visible) return;
    if (presetAccountId) {
      setMode('existing');
      setSelectedId(presetAccountId);
    } else {
      setMode(hasAccounts ? 'existing' : 'new');
      setSelectedId(null);
    }
  }, [visible, presetAccountId, hasAccounts]);

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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Yangi majburiyat</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {isPreset ? (
              <Field label="Kreditor">
                <View style={styles.presetBox}>
                  <Text style={styles.presetName}>{presetAccountName}</Text>
                </View>
              </Field>
            ) : (
              <>
                {hasAccounts ? (
                  <View style={styles.modeRow}>
                    <Pressable
                      style={[styles.modeChip, mode === 'existing' && styles.modeChipActive]}
                      onPress={() => setMode('existing')}>
                      <Text style={[styles.modeChipText, mode === 'existing' && styles.modeChipTextActive]}>
                        Mavjud kreditor
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.modeChip, mode === 'new' && styles.modeChipActive]}
                      onPress={() => setMode('new')}>
                      <Text style={[styles.modeChipText, mode === 'new' && styles.modeChipTextActive]}>
                        Yangi kreditor
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {mode === 'existing' ? (
                  <Field label="Kreditorni tanlang *">
                    <View style={styles.accountList}>
                      {accounts.map((a) => (
                        <Pressable
                          key={a.id}
                          style={styles.accountRow}
                          onPress={() => setSelectedId(a.id)}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.accountName} numberOfLines={1}>
                              {a.name}
                            </Text>
                            <Text style={styles.accountMeta}>{PAYABLE_CATEGORY_LABELS[a.category]}</Text>
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
                    <Field label="Kreditor nomi *">
                      <TextInput
                        style={styles.input}
                        value={newName}
                        onChangeText={setNewName}
                        placeholder="Masalan: Optom baza"
                        placeholderTextColor={colors.text.hint}
                      />
                    </Field>
                    <Field label="Turkumi *">
                      <View style={styles.categoryRow}>
                        {PAYABLE_CATEGORY_LIST.map((c) => (
                          <Pressable
                            key={c}
                            style={[styles.categoryChip, newCategory === c && styles.categoryChipActive]}
                            onPress={() => setNewCategory(c)}>
                            <Text
                              style={[
                                styles.categoryChipText,
                                newCategory === c && styles.categoryChipTextActive,
                              ]}>
                              {PAYABLE_CATEGORY_LABELS[c]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </Field>
                    <Field label="Telefon raqami (ixtiyoriy)">
                      <TextInput
                        style={styles.input}
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

            <Field label="Summa (so'm) *">
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="500 000"
                placeholderTextColor={colors.text.hint}
              />
            </Field>
            <Field label="Tavsif (ixtiyoriy)">
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Masalan: Guruch 50kg"
                placeholderTextColor={colors.text.hint}
              />
            </Field>
            <Field label="To'lash muddati (ixtiyoriy)">
              <Pressable style={styles.dateInput} onPress={() => setDatePickerOpen(true)}>
                <CalendarDays size={16} color={colors.brand.primary} strokeWidth={2.2} />
                <Text style={[styles.dateInputText, !dueDate && styles.dateInputPlaceholder]}>
                  {dueDate || 'Sanani tanlang'}
                </Text>
              </Pressable>
            </Field>
            <Field label="Izoh">
              <TextInput
                style={[styles.input, styles.multiline]}
                value={note}
                onChangeText={setNote}
                placeholder="Qo'shimcha izoh"
                placeholderTextColor={colors.text.hint}
                multiline
              />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Jami qarz</Text>
            <Text style={styles.totalValue}>{fmt(parseAmount(amount))} so&apos;m</Text>
          </View>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            disabled={!canSave || save.isPending}
            onPress={() => save.mutate()}>
            <Text style={styles.saveText}>{save.isPending ? 'Saqlanmoqda…' : 'Qarzga yozish'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <DatePickerModal
        visible={datePickerOpen}
        value={dueDate}
        title="To'lash muddati"
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
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: { ...typography.h4, color: colors.text.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  field: { gap: spacing.xs },
  label: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary },
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
  multiline: { minHeight: 56, textAlignVertical: 'top' },
  presetBox: {
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  presetName: { ...typography.bodyStrong, color: colors.brand.primary },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modeChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  modeChipText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.secondary },
  modeChipTextActive: { color: colors.text.onPrimary },
  accountList: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  accountName: { ...typography.bodySmall, fontWeight: '600', color: colors.text.primary },
  accountMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  categoryChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  categoryChipText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.secondary },
  categoryChipTextActive: { color: colors.text.onPrimary },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  dateInputText: { ...typography.body, color: colors.text.primary },
  dateInputPlaceholder: { color: colors.text.hint },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
    gap: spacing.sm,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { ...typography.body, color: colors.text.secondary },
  totalValue: { ...typography.h4, color: colors.brand.primary },
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
