import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, PackagePlus, X } from 'lucide-react-native';
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

import { tr } from '@/i18n';
import { DatePickerModal } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { PublicProductVariant } from '@/lib/types';
import { colors } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly variant: PublicProductVariant | null;
  readonly onClose: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function KirimModal({ visible, shopId, variant, onClose }: Props) {
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const reset = () => {
    setQuantity('');
    setCostPrice('');
    setExpiryDate('');
    setSupplierName('');
  };

  const receive = useMutation({
    mutationFn: async () => {
      if (!variant) return;
      await api.post(`/seller/shops/${shopId}/products/variants/${variant.id}/receive`, {
        quantity: parseAmount(quantity),
        costPrice: parseAmount(costPrice),
        expiryDate: expiryDate.trim() || undefined,
        supplierName: supplierName.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      qc.invalidateQueries({ queryKey: ['batches', variant?.id] });
      reset();
      onClose();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const qty = parseAmount(quantity);
  const cost = parseAmount(costPrice);
  const price = variant ? variant.discountPrice ?? variant.price : 0;
  const canSave = qty > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg-canvas" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center gap-2">
            <PackagePlus size={20} color={colors.brand.primary} strokeWidth={2.2} />
            <Text className="text-xl font-bold text-text-primary">{tr('kirim.title')}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {variant ? (
          <Text className="text-sm text-text-secondary px-4 mb-2" numberOfLines={1}>
            {variant.name} · {tr('kirim.currentStock', { n: variant.stock })}
          </Text>
        ) : null}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            <Field label={tr('kirim.qtyLabel')}>
              <TextInput
                className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder={tr('kirim.qtyPh')}
                placeholderTextColor={colors.text.hint}
                autoFocus
              />
            </Field>

            <Field label={tr('kirim.costLabel')}>
              <TextInput
                className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="number-pad"
                placeholder={tr('kirim.costPh')}
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            <Field label={tr('kirim.expiryLabel')}>
              <Pressable
                className="flex-row items-center gap-2 bg-bg-surface rounded-xl px-3 py-2.5 border border-border-default"
                onPress={() => setDatePickerOpen(true)}
              >
                <CalendarDays size={16} color={colors.brand.primary} strokeWidth={2.2} />
                <Text className={`text-base ${expiryDate ? 'text-text-primary' : 'text-text-hint'}`}>
                  {expiryDate || tr('kirim.pickDate')}
                </Text>
              </Pressable>
            </Field>

            <Field label={tr('kirim.supplierLabel')}>
              <TextInput
                className="bg-bg-surface rounded-xl px-3 py-2.5 text-base text-text-primary border border-border-default"
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder={tr('kirim.supplierPh')}
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            {qty > 0 ? (
              <View className="bg-brand-primary/10 rounded-xl p-3.5 gap-1.5 border border-brand-primary/20">
                <Row k={tr('kirim.totalSum')} v={`${fmt(qty * cost)} ${tr('common.som')}`} />
                <Row k={tr('kirim.newStock')} v={tr('kirim.pcs', { n: (variant?.stock ?? 0) + qty })} />
                {cost > 0 ? (
                  <Row
                    k={tr('kirim.profitPerUnit')}
                    v={`${fmt(Math.max(0, price - cost))} ${tr('common.som')}`}
                    highlight
                  />
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View className="px-4 pt-3 pb-2 border-t border-border-subtle bg-bg-surface">
          <Pressable
            className={`h-12 rounded-2xl items-center justify-center ${
              !canSave ? 'bg-border-strong' : receive.isPending ? 'bg-brand-primary opacity-60' : 'bg-brand-primary active:opacity-85'
            }`}
            disabled={!canSave || receive.isPending}
            onPress={() => receive.mutate()}>
            <Text className="text-base font-bold text-text-on-primary">
              {receive.isPending ? tr('kirim.saving') : tr('kirim.submit')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <DatePickerModal
        visible={datePickerOpen}
        value={expiryDate}
        title={tr('kirim.expiry')}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(iso) => {
          setExpiryDate(iso);
          setDatePickerOpen(false);
        }}
      />
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-bold text-text-primary">{label}</Text>
      {children}
    </View>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-text-secondary">{k}</Text>
      <Text className={`text-sm font-extrabold ${highlight ? 'text-feedback-success' : 'text-text-primary'}`}>{v}</Text>
    </View>
  );
}
