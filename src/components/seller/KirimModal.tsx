import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
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
import { SellerVariant } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly variant: SellerVariant | null;
  readonly onClose: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

/** "Kirim" — receive a new lot of stock with its purchase cost (FIFO batch). */
export function KirimModal({ visible, shopId, variant, onClose }: Props) {
  const qc = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierName, setSupplierName] = useState('');

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
        quantity: Number(quantity),
        costPrice: Number(costPrice) || 0,
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
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const qty = Number(quantity) || 0;
  const cost = Number(costPrice) || 0;
  const price = variant ? variant.discountPrice ?? variant.price : 0;
  const canSave = qty > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <PackagePlus size={20} color={colors.brand.primary} strokeWidth={2.2} />
            <Text style={styles.title}>Kirim — tovar keldi</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {variant ? (
          <Text style={styles.sub} numberOfLines={1}>
            {variant.name} · hozir {variant.stock} ta
          </Text>
        ) : null}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Field label="Nechta keldi? *">
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="Masalan: 50"
                placeholderTextColor={colors.text.hint}
                autoFocus
              />
            </Field>

            <Field label="Dona uchun kirim narxi (tannarx, so'm)">
              <TextInput
                style={styles.input}
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="number-pad"
                placeholder="Masalan: 3500"
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            <Field label="Muddati (ixtiyoriy)">
              <TextInput
                style={styles.input}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="YYYY-MM-DD (masalan 2027-01-15)"
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            <Field label="Yetkazib beruvchi (ixtiyoriy)">
              <TextInput
                style={styles.input}
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="Masalan: Optom baza"
                placeholderTextColor={colors.text.hint}
              />
            </Field>

            {qty > 0 ? (
              <View style={styles.preview}>
                <Row k="Jami kirim summasi" v={`${fmt(qty * cost)} so'm`} />
                <Row k="Yangi qoldiq" v={`${(variant?.stock ?? 0) + qty} ta`} />
                {cost > 0 ? (
                  <Row
                    k="Bu partiyadan foyda (dona)"
                    v={`${fmt(Math.max(0, price - cost))} so'm`}
                    highlight
                  />
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            disabled={!canSave || receive.isPending}
            onPress={() => receive.mutate()}>
            <Text style={styles.saveText}>{receive.isPending ? 'Saqlanmoqda…' : 'Kirim qilish'}</Text>
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

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewK}>{k}</Text>
      <Text style={[styles.previewV, highlight && { color: colors.feedback.success }]}>{v}</Text>
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
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h4, color: colors.text.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
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
  preview: {
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewK: { ...typography.bodySmall, color: colors.text.secondary },
  previewV: { ...typography.bodySmall, fontWeight: '800', color: colors.text.primary },
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
