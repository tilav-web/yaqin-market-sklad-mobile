import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpCircle, Plus, WifiOff, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { EmptyState } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { PAYABLE_CATEGORY_LABELS } from '@/lib/payableCategories';
import { PayableAccountDetail } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly accountId: string | null;
  readonly onClose: () => void;
  readonly onAddCharge: (accountId: string, accountName: string) => void;
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function fmtDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

export function PayableAccountModal({ visible, shopId, accountId, onClose, onAddCharge }: Props) {
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  const accountQuery = useQuery({
    queryKey: ['payable-account', shopId, accountId],
    enabled: visible && !!accountId,
    queryFn: async () => {
      const res = await api.get<PayableAccountDetail>(`/seller/shops/${shopId}/payables/account/${accountId}`);
      return res.data;
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      await api.post(`/seller/shops/${shopId}/payables/payments`, {
        accountId,
        amount: parseAmount(payAmount),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payable-account', shopId, accountId] });
      qc.invalidateQueries({ queryKey: ['payables', shopId] });
      setPayAmount('');
      setPayOpen(false);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const d = accountQuery.data;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {d?.account.name ?? 'Kreditor'}
            </Text>
            <Text style={styles.category}>{d ? PAYABLE_CATEGORY_LABELS[d.account.category] : ''}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {accountQuery.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
        ) : accountQuery.isError || !d ? (
          <EmptyState
            icon={WifiOff}
            title="Hisob yuklanmadi"
            description="Internetni tekshirib, qayta urinib ko'ring"
            actionLabel="Qayta urinish"
            onAction={() => void accountQuery.refetch()}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Balance */}
            <View style={[styles.balanceCard, d.balance > 0 ? styles.balanceDue : styles.balanceClear]}>
              <Text style={styles.balanceLabel}>Qolgan qarzim</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: d.balance > 0 ? colors.text.danger : colors.feedback.success },
                ]}>
                {fmt(d.balance)} so&apos;m
              </Text>
              <Text style={styles.balanceMeta}>
                Jami olingan {fmt(d.totalCharged)} · to&apos;langan {fmt(d.totalPaid)}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.payBtn} onPress={() => setPayOpen((v) => !v)}>
                <ArrowUpCircle size={18} color={colors.feedback.success} strokeWidth={2.3} />
                <Text style={styles.payText}>To&apos;lov qilish</Text>
              </Pressable>
              <Pressable
                style={styles.addChargeBtn}
                onPress={() => onAddCharge(d.account.id, d.account.name)}>
                <Plus size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
                <Text style={styles.addChargeText}>Majburiyat qo&apos;shish</Text>
              </Pressable>
            </View>

            {payOpen ? (
              <View style={styles.payForm}>
                <TextInput
                  style={styles.payInput}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="number-pad"
                  placeholder="To'lov summasi (so'm)"
                  placeholderTextColor={colors.text.hint}
                  autoFocus
                />
                <Pressable
                  style={[styles.payConfirm, !parseAmount(payAmount) && styles.payConfirmDisabled]}
                  disabled={!parseAmount(payAmount) || pay.isPending}
                  onPress={() => pay.mutate()}>
                  <Text style={styles.payConfirmText}>{pay.isPending ? '…' : "To'lash"}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Timeline */}
            <Text style={styles.sectionTitle}>Majburiyatlar</Text>
            {d.charges.length === 0 ? (
              <Text style={styles.dim}>Majburiyat yo&apos;q</Text>
            ) : (
              d.charges.map((c) => (
                <View key={c.id} style={styles.entry}>
                  <View style={styles.entryHead}>
                    <Text style={styles.entryTotal}>−{fmt(c.amount)} so&apos;m</Text>
                    <Text style={styles.entryDate}>{fmtDate(c.createdAt)}</Text>
                  </View>
                  {c.description ? <Text style={styles.entryLine}>{c.description}</Text> : null}
                  {c.dueDate ? <Text style={styles.entryDue}>To&apos;lash muddati: {c.dueDate}</Text> : null}
                  {c.note ? <Text style={styles.entryNote}>{c.note}</Text> : null}
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>To&apos;lovlar</Text>
            {d.payments.length === 0 ? (
              <Text style={styles.dim}>To&apos;lov yo&apos;q</Text>
            ) : (
              d.payments.map((p) => (
                <View key={p.id} style={styles.payRow}>
                  <Text style={styles.payRowAmount}>+{fmt(p.amount)} so&apos;m</Text>
                  <Text style={styles.entryDate}>{fmtDate(p.createdAt)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: { ...typography.h4, color: colors.text.primary },
  category: { ...typography.caption, color: colors.text.secondary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  balanceCard: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, alignItems: 'center', gap: 2 },
  balanceDue: { backgroundColor: colors.feedback.dangerSurface, borderColor: colors.feedback.dangerSurface },
  balanceClear: { backgroundColor: colors.feedback.successSurface, borderColor: colors.feedback.successSurface },
  balanceLabel: { ...typography.caption, color: colors.text.secondary },
  balanceValue: { ...typography.h2 },
  balanceMeta: { ...typography.caption, color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.feedback.success,
  },
  payText: { ...typography.bodySmall, fontWeight: '700', color: colors.feedback.success },
  addChargeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
  },
  addChargeText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.onPrimary },
  payForm: { flexDirection: 'row', gap: spacing.sm },
  payInput: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  payConfirm: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payConfirmDisabled: { backgroundColor: colors.border.strong },
  payConfirmText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
  sectionTitle: { ...typography.overline, color: colors.text.secondary, marginTop: spacing.sm },
  dim: { ...typography.bodySmall, color: colors.text.tertiary },
  entry: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 2,
  },
  entryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  entryTotal: { ...typography.bodyStrong, color: colors.text.danger },
  entryDate: { ...typography.caption, color: colors.text.tertiary },
  entryLine: { ...typography.caption, color: colors.text.primary },
  entryDue: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700', marginTop: 2 },
  entryNote: { ...typography.caption, color: colors.text.secondary, fontStyle: 'italic', marginTop: 2 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.feedback.successSurface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  payRowAmount: { ...typography.bodyStrong, color: colors.feedback.success },
});
