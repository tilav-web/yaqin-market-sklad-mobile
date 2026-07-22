import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Star, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input, useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { SavedCard } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

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

export default function SavedCardsScreen() {
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');

  const cardsQuery = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => (await api.get<SavedCard[]>('/click/cards')).data,
  });

  const resetForm = () => {
    setAdding(false);
    setCardNumber('');
    setExpiry('');
    setPendingCardId(null);
    setPendingPhone(null);
    setSmsCode('');
  };

  const addCard = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ cardId: string; phoneNumber: string | null }>('/click/cards', {
        card_number: cardNumber.replace(/\D/g, ''),
        expire_date: expiry.replace(/\D/g, ''),
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
      if (!pendingCardId) return;
      const res = await api.post<SavedCard>(`/click/cards/${pendingCardId}/verify`, { sms_code: smsCode });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-cards'] });
      toast.success(tr('common.confirm'));
      resetForm();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/click/cards/${id}/default`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-cards'] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/click/cards/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-cards'] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const confirmDelete = (card: SavedCard) =>
    Alert.alert(tr('cards.delete'), tr('cards.deleteConfirm'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('cards.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(card.id) },
    ]);

  const canSubmitCard = cardNumber.replace(/\D/g, '').length >= 16 && expiry.replace(/\D/g, '').length === 4;
  const canVerify = smsCode.trim().length >= 4;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={(cardsQuery.data ?? []).filter((c) => c.status === 'active')}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!adding ? <Text style={styles.hint}>{tr('cards.empty')}</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <CreditCard size={20} color={colors.brand.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{item.cardNumberMasked ?? '•••• ••••'}</Text>
                {item.isDefault && (
                  <View style={styles.defaultTag}>
                    <Star size={10} color={colors.brand.primary} fill={colors.brand.primary} />
                    <Text style={styles.defaultTagText}>{tr('cards.default')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.actions}>
                {!item.isDefault && (
                  <Pressable
                    hitSlop={6}
                    onPress={() => setDefaultMutation.mutate(item.id)}
                    style={styles.actionBtn}>
                    <Star size={14} color={colors.text.tertiary} strokeWidth={2.2} />
                    <Text style={styles.actionText}>{tr('cards.makeDefault')}</Text>
                  </Pressable>
                )}
                <Pressable hitSlop={6} onPress={() => confirmDelete(item)} style={styles.actionBtn}>
                  <Trash2 size={14} color={colors.text.danger} strokeWidth={2.2} />
                  <Text style={[styles.actionText, { color: colors.text.danger }]}>{tr('cards.delete')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          adding ? (
            <View style={styles.form}>
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
                  <Text style={styles.formTitle}>{tr('cards.add')}</Text>
                  <Input
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                    placeholder={tr('cards.cardNumber')}
                    keyboardType="number-pad"
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
              <Pressable onPress={resetForm} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>{tr('common.cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                haptics.selection();
                setAdding(true);
              }}>
              <Text style={styles.addBtnText}>{tr('cards.add')}</Text>
            </Pressable>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, gap: spacing.md },
  hint: { ...typography.bodySmall, color: colors.text.secondary, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  label: { ...typography.bodyStrong, color: colors.text.primary },
  defaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.brand.primarySurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  defaultTagText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { ...typography.caption, color: colors.text.tertiary, fontWeight: '600' },
  addBtn: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    borderStyle: 'dashed',
  },
  addBtnText: { ...typography.body, color: colors.brand.primary, fontWeight: '700' },
  form: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
  },
  formTitle: { ...typography.h4, color: colors.text.primary },
  smsHint: { ...typography.bodySmall, color: colors.text.secondary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { ...typography.body, color: colors.text.secondary },
});
