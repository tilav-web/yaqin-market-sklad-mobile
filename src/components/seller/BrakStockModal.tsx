import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { BrakReasonCode } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

const REASONS: { key: BrakReasonCode; label: string }[] = [
  { key: 'expired', label: "Muddati o'tdi" },
  { key: 'damaged', label: 'Shikastlangan / singan' },
  { key: 'stolen', label: "Yo'qolgan / o'g'irlangan" },
  { key: 'other', label: 'Boshqa' },
];

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly variant: { id: string; name: string; stock: number } | null;
  readonly onClose: () => void;
}

/**
 * "Brak qil" — writes off a variant's ENTIRE remaining stock with a mandatory
 * reason code (SPEC.md §26.3). Destructive and irreversible (server zeroes
 * stock via FIFO consumption), so this is a confirm-first bottom sheet rather
 * than a silent one-tap action.
 */
export function BrakStockModal({ visible, shopId, variant, onClose }: Props) {
  const qc = useQueryClient();
  const [reasonCode, setReasonCode] = useState<BrakReasonCode>('expired');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setReasonCode('expired');
      setNote('');
    }
  }, [visible]);

  const brak = useMutation({
    mutationFn: async () => {
      if (!variant) return;
      await api.post(`/seller/shops/${shopId}/products/variants/${variant.id}/brak`, {
        reasonCode,
        note: reasonCode === 'other' ? note.trim() : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      qc.invalidateQueries({ queryKey: ['variants-expiring', shopId] });
      qc.invalidateQueries({ queryKey: ['variants-low-stock', shopId] });
      Alert.alert(tr('common.saved'), `"${variant?.name}" brak qilindi, qoldiq: 0`);
      onClose();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const canSave = reasonCode !== 'other' || note.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <AlertTriangle size={18} color={colors.feedback.danger} strokeWidth={2.2} />
            <Text style={styles.sheetTitle}>Brak qilish</Text>
          </View>
          <Text style={styles.sheetSub}>
            "{variant?.name}" ning butun qoldig'i ({variant?.stock ?? 0} ta) nolga tushiriladi. Bu
            amalni qaytarib bo'lmaydi.
          </Text>

          <Text style={styles.fieldLabel}>Sabab</Text>
          <View style={styles.reasonWrap}>
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setReasonCode(r.key)}
                style={[styles.reasonChip, reasonCode === r.key && styles.reasonChipActive]}>
                <Text
                  style={[
                    styles.reasonChipText,
                    reasonCode === r.key && styles.reasonChipTextActive,
                  ]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {reasonCode === 'other' && (
            <>
              <Text style={styles.fieldLabel}>Izoh (shart)</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Sababni yozing"
                placeholderTextColor={colors.text.hint}
                multiline
              />
            </>
          )}

          <Pressable
            style={[styles.confirmBtn, (!canSave || brak.isPending) && styles.confirmBtnDisabled]}
            onPress={() => brak.mutate()}
            disabled={!canSave || brak.isPending}>
            {brak.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text style={styles.confirmBtnText}>Brak qilish</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Bekor qilish</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sheetTitle: { ...typography.h3, color: colors.text.primary },
  sheetSub: { ...typography.bodySmall, color: colors.text.secondary },
  fieldLabel: { ...typography.caption, fontWeight: '700', color: colors.text.secondary, marginTop: spacing.sm },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  reasonChipActive: { backgroundColor: colors.feedback.danger, borderColor: colors.feedback.danger },
  reasonChipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  reasonChipTextActive: { color: colors.text.onPrimary },
  noteInput: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surfaceMuted,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.feedback.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  confirmBtnDisabled: { backgroundColor: colors.border.strong },
  confirmBtnText: { ...typography.button, color: colors.text.onPrimary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelBtnText: { ...typography.body, color: colors.text.secondary },
});
