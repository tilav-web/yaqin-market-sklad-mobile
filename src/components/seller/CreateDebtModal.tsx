import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Minus, Plus, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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

import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { SellerVariant } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly onClose: () => void;
  /** Pre-fill the customer (when adding a debt from an existing account). */
  readonly presetName?: string;
  readonly presetPhone?: string;
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function CreateDebtModal({ visible, shopId, onClose, presetName, presetPhone }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(presetName ?? '');
  const [phone, setPhone] = useState(presetPhone ?? '');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  // Remember picked products so the running total survives a search change.
  const [picked, setPicked] = useState<Record<string, SellerVariant>>({});
  const [extraCharge, setExtraCharge] = useState('');
  const [note, setNote] = useState('');
  // Required, no default — the seller must explicitly choose.
  const [decrementStock, setDecrementStock] = useState<boolean | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const variantsQuery = useQuery({
    queryKey: ['variants', shopId, 'pick', search],
    enabled: visible,
    queryFn: async () => {
      const res = await api.get<SellerVariant[]>(`/seller/shops/${shopId}/products/variants`, {
        params: { search: search || undefined, limit: 50 },
      });
      return res.data;
    },
  });

  const filtered = variantsQuery.data ?? [];

  const reset = () => {
    setName('');
    setPhone('');
    setSearchInput('');
    setSearch('');
    setQty({});
    setPicked({});
    setExtraCharge('');
    setNote('');
    setDecrementStock(null);
  };

  const itemsTotal = useMemo(
    () =>
      Object.entries(qty).reduce((sum, [vid, q]) => {
        const v = picked[vid];
        if (!v) return sum;
        return sum + (v.discountPrice ?? v.price) * q;
      }, 0),
    [qty, picked],
  );
  const total = itemsTotal + (parseAmount(extraCharge));

  const save = useMutation({
    mutationFn: async () => {
      const lines = Object.entries(qty)
        .filter(([, q]) => q > 0)
        .map(([variantId, quantity]) => ({ variantId, quantity }));
      await api.post(`/seller/shops/${shopId}/debts`, {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        lines,
        extraCharge: parseAmount(extraCharge),
        note: note.trim() || undefined,
        decrementStock,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts', shopId] });
      qc.invalidateQueries({ queryKey: ['debt-account', shopId] });
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      reset();
      onClose();
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const setQ = (v: SellerVariant, delta: number) => {
    if (delta > 0) setPicked((p) => ({ ...p, [v.id]: v }));
    setQty((c) => {
      const next = Math.max(0, (c[v.id] ?? 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[v.id];
      else copy[v.id] = next;
      return copy;
    });
  };

  const validName = name.trim().length > 0;
  const validPhone = /^\+?\d{9,15}$/.test(phone.trim());
  const canSave = validName && validPhone && total > 0 && decrementStock !== null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Yangi qarz</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Customer */}
            <Field label="Mijoz ismi *">
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Akmal aka" placeholderTextColor={colors.text.hint} />
            </Field>
            <Field label="Telefon raqami *">
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+998901234567"
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            {/* Product picker */}
            <Text style={styles.label}>Mahsulotlar</Text>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Mahsulot qidirish"
                placeholderTextColor={colors.text.hint}
              />
            </View>
            <View style={styles.productList}>
              {filtered.map((v) => {
                const q = qty[v.id] ?? 0;
                const price = v.discountPrice ?? v.price;
                return (
                  <View key={v.id} style={styles.pRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pName} numberOfLines={1}>
                        {v.name}
                      </Text>
                      <Text style={styles.pMeta}>
                        {fmt(price)} so&apos;m · qoldiq {v.stock}
                      </Text>
                    </View>
                    {q > 0 ? (
                      <View style={styles.stepper}>
                        <Pressable style={styles.stepBtn} onPress={() => setQ(v, -1)}>
                          <Minus size={14} color={colors.brand.primary} strokeWidth={2.8} />
                        </Pressable>
                        <Text style={styles.qVal}>{q}</Text>
                        <Pressable style={styles.stepBtn} onPress={() => setQ(v, 1)}>
                          <Plus size={14} color={colors.brand.primary} strokeWidth={2.8} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={styles.addBtn} onPress={() => setQ(v, 1)}>
                        <Plus size={16} color={colors.text.onPrimary} strokeWidth={2.8} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Extra charge for off-system items */}
            <Field label="Qo'shimcha narx (tizimda yo'q tovarlar uchun)">
              <TextInput
                style={styles.input}
                value={extraCharge}
                onChangeText={setExtraCharge}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.text.hint}
              />
            </Field>
            <Field label="Izoh">
              <TextInput
                style={[styles.input, styles.multiline]}
                value={note}
                onChangeText={setNote}
                placeholder="Masalan: cola va non oldi"
                placeholderTextColor={colors.text.hint}
                multiline
              />
            </Field>

            {/* REQUIRED: decrement stock? */}
            <View style={[styles.askBox, decrementStock === null && styles.askBoxRequired]}>
              <Text style={styles.askTitle}>Qoldiqdan kamaytirilsinmi? *</Text>
              <Text style={styles.askSub}>Tanlangan tizim mahsulotlari ombordan kamaytirilsinmi?</Text>
              <View style={styles.askRow}>
                <Pressable
                  style={[styles.askChip, decrementStock === true && styles.askChipYes]}
                  onPress={() => setDecrementStock(true)}>
                  {decrementStock === true ? <Check size={15} color={colors.text.onPrimary} strokeWidth={3} /> : null}
                  <Text style={[styles.askChipText, decrementStock === true && styles.askChipTextActive]}>Ha, kamaytirilsin</Text>
                </Pressable>
                <Pressable
                  style={[styles.askChip, decrementStock === false && styles.askChipNo]}
                  onPress={() => setDecrementStock(false)}>
                  {decrementStock === false ? <Check size={15} color={colors.text.onPrimary} strokeWidth={3} /> : null}
                  <Text style={[styles.askChipText, decrementStock === false && styles.askChipTextActive]}>Yo&apos;q</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Jami qarz</Text>
            <Text style={styles.totalValue}>{fmt(total)} so&apos;m</Text>
          </View>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            disabled={!canSave || save.isPending}
            onPress={() => save.mutate()}>
            <Text style={styles.saveText}>{save.isPending ? 'Saqlanmoqda…' : 'Qarzga yozish'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
  closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.bg.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: { flex: 1, paddingVertical: 10, ...typography.body, color: colors.text.primary },
  productList: { backgroundColor: colors.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.subtle },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  pName: { ...typography.bodySmall, fontWeight: '600', color: colors.text.primary },
  pMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  addBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 30, height: 30, borderRadius: radius.full, backgroundColor: colors.brand.primarySurface, alignItems: 'center', justifyContent: 'center' },
  qVal: { ...typography.bodyStrong, color: colors.text.primary, minWidth: 20, textAlign: 'center' },
  askBox: { backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1.5, borderColor: colors.border.default, gap: spacing.xs },
  askBoxRequired: { borderColor: colors.feedback.warning },
  askTitle: { ...typography.bodySmall, fontWeight: '800', color: colors.text.primary },
  askSub: { ...typography.caption, color: colors.text.secondary },
  askRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  askChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  askChipYes: { backgroundColor: colors.feedback.success, borderColor: colors.feedback.success },
  askChipNo: { backgroundColor: colors.text.secondary, borderColor: colors.text.secondary },
  askChipText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.secondary },
  askChipTextActive: { color: colors.text.onPrimary },
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
  saveBtn: { height: layout.buttonHeight.md, borderRadius: radius.lg, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
