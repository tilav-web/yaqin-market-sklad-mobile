import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, Plus, WifiOff, X } from 'lucide-react-native';
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
import { DebtAccountDetail } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly phone: string | null;
  readonly onClose: () => void;
  readonly onAddDebt: (name: string, phone: string) => void;
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function fmtDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

export function DebtAccountModal({ visible, shopId, phone, onClose, onAddDebt }: Props) {
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  const accountQuery = useQuery({
    queryKey: ['debt-account', shopId, phone],
    enabled: visible && !!phone,
    queryFn: async () => {
      const res = await api.get<DebtAccountDetail>(
        `/seller/shops/${shopId}/debts/account/${encodeURIComponent(phone!)}`,
      );
      return res.data;
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      await api.post(`/seller/shops/${shopId}/debts/payment`, {
        customerPhone: phone,
        amount: parseAmount(payAmount),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debt-account', shopId, phone] });
      qc.invalidateQueries({ queryKey: ['debts', shopId] });
      setPayAmount('');
      setPayOpen(false);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const a = accountQuery.data;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {a?.customerName ?? 'Mijoz'}
            </Text>
            <Text style={styles.phone}>{phone}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {accountQuery.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
        ) : accountQuery.isError || !a ? (
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
            <View style={[styles.balanceCard, a.balance > 0 ? styles.balanceDue : styles.balanceClear]}>
              <Text style={styles.balanceLabel}>Qolgan qarz</Text>
              <Text style={[styles.balanceValue, { color: a.balance > 0 ? colors.text.danger : colors.feedback.success }]}>
                {fmt(a.balance)} so&apos;m
              </Text>
              <Text style={styles.balanceMeta}>
                Jami olingan {fmt(a.totalDebt)} · to&apos;langan {fmt(a.totalPaid)}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable style={styles.payBtn} onPress={() => setPayOpen((v) => !v)}>
                <ArrowDownCircle size={18} color={colors.feedback.success} strokeWidth={2.3} />
                <Text style={styles.payText}>To&apos;lov qabul qilish</Text>
              </Pressable>
              <Pressable
                style={styles.addDebtBtn}
                onPress={() => onAddDebt(a.customerName, a.customerPhone)}>
                <Plus size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
                <Text style={styles.addDebtText}>Qarz qo&apos;shish</Text>
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
                  <Text style={styles.payConfirmText}>{pay.isPending ? '…' : 'Qabul'}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Timeline */}
            <Text style={styles.sectionTitle}>Qarzlar</Text>
            {a.debts.length === 0 ? (
              <Text style={styles.dim}>Qarz yo&apos;q</Text>
            ) : (
              a.debts.map((d) => (
                <View key={d.id} style={styles.entry}>
                  <View style={styles.entryHead}>
                    <Text style={styles.entryTotal}>−{fmt(d.total)} so&apos;m</Text>
                    <Text style={styles.entryDate}>{fmtDate(d.createdAt)}</Text>
                  </View>
                  {d.lines.map((l, i) => (
                    <Text key={`${d.id}-${i}`} style={styles.entryLine}>
                      • {l.quantity} × {l.name} ({fmt(l.lineTotal)})
                    </Text>
                  ))}
                  {d.extraCharge > 0 ? (
                    <Text style={styles.entryLine}>• Qo&apos;shimcha: {fmt(d.extraCharge)} so&apos;m</Text>
                  ) : null}
                  {d.note ? <Text style={styles.entryNote}>{d.note}</Text> : null}
                  {!d.stockDecremented ? (
                    <Text style={styles.entryFlag}>Qoldiqdan kamaytirilmagan</Text>
                  ) : null}
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>To&apos;lovlar</Text>
            {a.payments.length === 0 ? (
              <Text style={styles.dim}>To&apos;lov yo&apos;q</Text>
            ) : (
              a.payments.map((p) => (
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
  phone: { ...typography.caption, color: colors.text.secondary },
  closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.bg.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
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
  addDebtBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
  },
  addDebtText: { ...typography.bodySmall, fontWeight: '700', color: colors.text.onPrimary },
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
  payConfirm: { paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.feedback.success, alignItems: 'center', justifyContent: 'center' },
  payConfirmDisabled: { backgroundColor: colors.border.strong },
  payConfirmText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
  sectionTitle: { ...typography.overline, color: colors.text.secondary, marginTop: spacing.sm },
  dim: { ...typography.bodySmall, color: colors.text.tertiary },
  entry: { backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle, gap: 2 },
  entryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  entryTotal: { ...typography.bodyStrong, color: colors.text.danger },
  entryDate: { ...typography.caption, color: colors.text.tertiary },
  entryLine: { ...typography.caption, color: colors.text.primary },
  entryNote: { ...typography.caption, color: colors.text.secondary, fontStyle: 'italic', marginTop: 2 },
  entryFlag: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700', marginTop: 2 },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.feedback.successSurface, borderRadius: radius.md, padding: spacing.md },
  payRowAmount: { ...typography.bodyStrong, color: colors.feedback.success },
});
