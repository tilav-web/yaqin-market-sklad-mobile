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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { SellerVariant } from '@/lib/types';
import { colors } from '@/theme';

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
  const { tr } = useTranslation();
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
  const total = itemsTotal + parseAmount(extraCharge);

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
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
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
      <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Text className="text-xl font-bold text-text-primary">{tr('debt.title')}</Text>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Customer */}
            <Field label={tr('debt.customerName')}>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                value={name}
                onChangeText={setName}
                placeholder={tr('debt.customerNamePlaceholder')}
                placeholderTextColor={colors.text.hint}
              />
            </Field>
            <Field label={tr('debt.phone')}>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+998901234567"
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            {/* Product picker */}
            <View className="gap-2">
              <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('debt.products')}</Text>
              <View className="flex-row items-center gap-2 bg-surface rounded-xl px-3 border border-border">
                <Search size={16} color={colors.text.tertiary} />
                <TextInput
                  className="flex-1 py-2.5 text-base text-text-primary"
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder={tr('debt.searchPlaceholder')}
                  placeholderTextColor={colors.text.hint}
                />
              </View>
              <View className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                {filtered.map((v) => {
                  const q = qty[v.id] ?? 0;
                  const price = v.discountPrice ?? v.price;
                  return (
                    <View key={v.id} className="flex-row items-center gap-3 p-3 border-b border-border-subtle">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                          {v.name}
                        </Text>
                        <Text className="text-xs text-text-secondary mt-0.5">
                          {fmt(price)} {tr('common.som')} · {tr('debt.stockLeft', { n: v.stock })}
                        </Text>
                      </View>
                      {q > 0 ? (
                        <View className="flex-row items-center gap-2">
                          <Pressable className="w-7 h-7 rounded-full bg-brand-primary/10 items-center justify-center" onPress={() => setQ(v, -1)}>
                            <Minus size={14} color={colors.brand.primary} strokeWidth={2.8} />
                          </Pressable>
                          <Text className="text-sm font-bold text-text-primary min-w-[20px] text-center">{q}</Text>
                          <Pressable className="w-7 h-7 rounded-full bg-brand-primary/10 items-center justify-center" onPress={() => setQ(v, 1)}>
                            <Plus size={14} color={colors.brand.primary} strokeWidth={2.8} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable className="w-8 h-8 rounded-full bg-brand-primary items-center justify-center" onPress={() => setQ(v, 1)}>
                          <Plus size={16} color={colors.text.onPrimary} strokeWidth={2.8} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Extra charge for off-system items */}
            <Field label={tr('debt.extraCharge')}>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                value={extraCharge}
                onChangeText={setExtraCharge}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.text.hint}
              />
            </Field>
            <Field label={tr('debt.note')}>
              <TextInput
                className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border min-h-[56px]"
                value={note}
                onChangeText={setNote}
                placeholder={tr('debt.notePlaceholder')}
                placeholderTextColor={colors.text.hint}
                multiline
                textAlignVertical="top"
              />
            </Field>

            {/* REQUIRED: decrement stock? */}
            <View className={`bg-surface rounded-xl p-4 border ${decrementStock === null ? 'border-amber-500' : 'border-border'} gap-1.5`}>
              <Text className="text-sm font-bold text-text-primary">{tr('debt.decrementTitle')}</Text>
              <Text className="text-xs text-text-secondary">{tr('debt.decrementSub')}</Text>
              <View className="flex-row gap-2 mt-2">
                <Pressable
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border ${
                    decrementStock === true ? 'bg-emerald-600 border-emerald-600' : 'border-border'
                  }`}
                  onPress={() => setDecrementStock(true)}>
                  {decrementStock === true ? <Check size={15} color={colors.text.onPrimary} strokeWidth={3} /> : null}
                  <Text className={`text-xs font-bold ${decrementStock === true ? 'text-white' : 'text-text-secondary'}`}>
                    {tr('debt.decrementYes')}
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border ${
                    decrementStock === false ? 'bg-slate-600 border-slate-600' : 'border-border'
                  }`}
                  onPress={() => setDecrementStock(false)}>
                  {decrementStock === false ? <Check size={15} color={colors.text.onPrimary} strokeWidth={3} /> : null}
                  <Text className={`text-xs font-bold ${decrementStock === false ? 'text-white' : 'text-text-secondary'}`}>
                    {tr('common.no')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer */}
        <View className="px-4 py-3 border-t border-border-subtle bg-surface gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-text-secondary">{tr('debt.totalDebt')}</Text>
            <Text className="text-xl font-bold text-brand-primary">
              {fmt(total)} {tr('common.som')}
            </Text>
          </View>
          <Pressable
            className={`h-12 rounded-xl items-center justify-center ${canSave && !save.isPending ? 'bg-brand-primary' : 'bg-surface-disabled'}`}
            disabled={!canSave || save.isPending}
            onPress={() => save.mutate()}>
            <Text className="text-base font-bold text-white">
              {save.isPending ? tr('debt.saving') : tr('debt.submit')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
