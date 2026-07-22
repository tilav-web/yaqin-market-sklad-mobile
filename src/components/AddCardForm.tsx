import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CardVisual } from '@/components/CardVisual';
import { Button, Input } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { SavedCard } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { CARD_BRAND_LABEL, detectCardBrand } from '@/utils/cardBrand';

/** Groups digits into "1234 5678 ..." as the user types; submit strips spaces back out. */
function formatCardNumber(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** "MM/YY" as the user types; submit strips the slash back out to MMYY. */
function formatExpiry(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

interface Props {
  readonly onDone: (card: SavedCard) => void;
  readonly onCancel: () => void;
}

/**
 * Shared "add a saved card" flow: number → SMS verify. Used both as the
 * saved-cards screen's inline footer and inside checkout's add-card sheet, so
 * the two never drift on validation or the Click request/verify contract.
 */
export function AddCardForm({ onDone, onCancel }: Props) {
  const { tr } = useTranslation();
  const qc = useQueryClient();

  const [label, setLabel] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');

  const brand = detectCardBrand(cardNumber);

  const addCard = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ cardId: string; phoneNumber: string | null }>('/click/cards', {
        card_number: cardNumber.replace(/\D/g, ''),
        expire_date: expiry.replace(/\D/g, ''),
        label: label.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: ({ cardId, phoneNumber }) => {
      setPendingCardId(cardId);
      setPendingPhone(phoneNumber);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const verifyCard = useMutation({
    mutationFn: async () => {
      if (!pendingCardId) return null;
      const res = await api.post<SavedCard>(`/click/cards/${pendingCardId}/verify`, { sms_code: smsCode });
      return res.data;
    },
    onSuccess: (card) => {
      qc.invalidateQueries({ queryKey: ['saved-cards'] });
      if (card) onDone(card);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const canSubmitCard = cardNumber.replace(/\D/g, '').length >= 16 && expiry.replace(/\D/g, '').length === 4;
  const canVerify = smsCode.trim().length >= 4;

  return (
    <View style={styles.form}>
      <CardVisual
        brand={brand}
        numberText={cardNumber || '•••• •••• •••• ••••'}
        label={label}
        expiry={expiry || undefined}
        fallbackLabel={tr('cards.genericName')}
      />

      {pendingCardId ? (
        <>
          <Text style={styles.formTitle}>{tr('cards.smsCode')}</Text>
          <Text style={styles.smsHint}>{tr('cards.smsHint', { phone: pendingPhone ?? '' })}</Text>
          <Input
            value={smsCode}
            onChangeText={(t) => setSmsCode(t.replace(/\D/g, '').slice(0, 6))}
            placeholder={tr('cards.smsCode')}
            keyboardType="number-pad"
          />
          <Button
            label={verifyCard.isPending ? tr('cards.saving') : tr('cards.verify')}
            onPress={() => verifyCard.mutate()}
            disabled={!canVerify || verifyCard.isPending}
            loading={verifyCard.isPending}
            variant="primary"
            fullWidth
          />
        </>
      ) : (
        <>
          <Input value={label} onChangeText={setLabel} placeholder={tr('cards.nickname')} maxLength={40} />
          <Input
            value={cardNumber}
            onChangeText={(t) => setCardNumber(formatCardNumber(t))}
            placeholder={tr('cards.cardNumber')}
            keyboardType="number-pad"
            rightSlot={
              brand ? (
                <Text style={[styles.brandBadge, { backgroundColor: colors.cardBrand[brand].base }]}>
                  {CARD_BRAND_LABEL[brand]}
                </Text>
              ) : undefined
            }
          />
          <Input
            value={expiry}
            onChangeText={(t) => setExpiry(formatExpiry(t))}
            placeholder={tr('cards.expiry')}
            keyboardType="number-pad"
            maxLength={5}
          />
          <Button
            label={addCard.isPending ? tr('cards.saving') : tr('common.continue')}
            onPress={() => addCard.mutate()}
            disabled={!canSubmitCard || addCard.isPending}
            loading={addCard.isPending}
            variant="primary"
            fullWidth
          />
        </>
      )}
      <Pressable onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>{tr('common.cancel')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  formTitle: { ...typography.h4, color: colors.text.primary },
  smsHint: { ...typography.bodySmall, color: colors.text.secondary },
  brandBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    letterSpacing: 0.5,
  },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { ...typography.body, color: colors.text.secondary },
});
