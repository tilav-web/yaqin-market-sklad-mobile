import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { tr, type TranslationKey } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { BrakReasonCode } from '@/lib/types';
import { colors } from '@/theme';

const REASONS: { key: BrakReasonCode; labelKey: TranslationKey }[] = [
  { key: 'expired', labelKey: 'brak.expired' },
  { key: 'damaged', labelKey: 'brak.damaged' },
  { key: 'stolen', labelKey: 'brak.stolen' },
  { key: 'other', labelKey: 'brak.other' },
];

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly variant: { id: string; name: string; stock: number } | null;
  readonly onClose: () => void;
}

export function BrakStockModal({ visible, shopId, variant, onClose }: Props) {
  const qc = useQueryClient();
  const [reasonCode, setReasonCode] = useState<BrakReasonCode>('expired');
  const [note, setNote] = useState('');

  const [syncedVisible, setSyncedVisible] = useState<boolean | null>(null);
  if (syncedVisible !== visible) {
    setSyncedVisible(visible);
    if (visible) {
      setReasonCode('expired');
      setNote('');
    }
  }

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
        className="flex-1 bg-black/45 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="bg-bg-surface rounded-t-3xl p-6 gap-2">
          <View className="flex-row items-center gap-1.5">
            <AlertTriangle size={18} color={colors.feedback.danger} strokeWidth={2.2} />
            <Text className="text-xl font-bold text-text-primary">{tr('brak.title')}</Text>
          </View>
          <Text className="text-xs text-text-secondary">
            "{variant?.name}" ning butun qoldig'i ({variant?.stock ?? 0} ta) nolga tushiriladi. Bu
            amalni qaytarib bo'lmaydi.
          </Text>

          <Text className="text-xs font-bold text-text-secondary mt-2">{tr('brak.reason')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {REASONS.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setReasonCode(r.key)}
                className={`px-4 py-2 rounded-full border ${
                  reasonCode === r.key
                    ? 'bg-feedback-danger border-feedback-danger'
                    : 'border-border-default bg-bg-surface'
                }`}>
                <Text
                  className={`text-xs font-bold ${
                    reasonCode === r.key ? 'text-text-on-primary' : 'text-text-secondary'
                  }`}>
                  {tr(r.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          {reasonCode === 'other' && (
            <>
              <Text className="text-xs font-bold text-text-secondary mt-2">{tr('brak.noteRequired')}</Text>
              <TextInput
                className="text-base text-text-primary border border-border-default rounded-xl px-4 py-2.5 bg-bg-surface-muted min-h-[60px]"
                textAlignVertical="top"
                value={note}
                onChangeText={setNote}
                placeholder={tr('brak.reasonPlaceholder')}
                placeholderTextColor={colors.text.hint}
                multiline
              />
            </>
          )}

          <Pressable
            className={`h-12 rounded-2xl bg-feedback-danger items-center justify-center mt-2 ${
              !canSave || brak.isPending ? 'bg-border-strong' : 'active:opacity-85'
            }`}
            onPress={() => brak.mutate()}
            disabled={!canSave || brak.isPending}>
            {brak.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text className="text-base font-bold text-text-on-primary">{tr('brak.title')}</Text>
            )}
          </Pressable>
          <Pressable className="items-center py-2 active:opacity-75" onPress={onClose}>
            <Text className="text-sm text-text-secondary">{tr('common.cancel')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
