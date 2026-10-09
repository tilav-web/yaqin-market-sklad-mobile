import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, Plus, WifiOff, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
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
import { colors } from '@/theme';

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
      <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <View className="flex-1">
            <Text className="text-xl font-bold text-text-primary" numberOfLines={1}>
              {a?.customerName ?? tr('debtAcc.customer')}
            </Text>
            <Text className="text-xs text-text-secondary">{phone}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {accountQuery.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
        ) : accountQuery.isError || !a ? (
          <EmptyState
            icon={WifiOff}
            title={tr('debtAcc.loadFailed')}
            description={tr('common.error.desc')}
            actionLabel={tr('common.retry')}
            onAction={() => void accountQuery.refetch()}
          />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
            {/* Balance Card */}
            <View
              className={`rounded-2xl p-5 border items-center gap-0.5 ${
                a.balance > 0
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20'
              }`}>
              <Text className="text-xs text-text-secondary">{tr('debtAcc.remaining')}</Text>
              <Text className={`text-3xl font-extrabold ${a.balance > 0 ? 'text-text-danger' : 'text-feedback-success'}`}>
                {fmt(a.balance)} {tr('common.som')}
              </Text>
              <Text className="text-xs text-text-secondary">
                {tr('debtAcc.totalsMeta', { taken: fmt(a.totalDebt), paid: fmt(a.totalPaid) })}
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl border border-feedback-success bg-feedback-success/5"
                onPress={() => setPayOpen((v) => !v)}>
                <ArrowDownCircle size={18} color={colors.feedback.success} strokeWidth={2.3} />
                <Text className="text-xs font-bold text-feedback-success">{tr('debtAcc.acceptPayment')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-brand-primary"
                onPress={() => onAddDebt(a.customerName, a.customerPhone)}>
                <Plus size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
                <Text className="text-xs font-bold text-white">{tr('debtAcc.addDebt')}</Text>
              </Pressable>
            </View>

            {payOpen ? (
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="number-pad"
                  placeholder={tr('debtAcc.amountPh')}
                  placeholderTextColor={colors.text.hint}
                  autoFocus
                />
                <Pressable
                  className={`px-5 rounded-xl items-center justify-center ${
                    parseAmount(payAmount) && !pay.isPending ? 'bg-feedback-success' : 'bg-surface-disabled'
                  }`}
                  disabled={!parseAmount(payAmount) || pay.isPending}
                  onPress={() => pay.mutate()}>
                  <Text className="text-sm font-bold text-white">{pay.isPending ? '…' : tr('debtAcc.accept')}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Timeline: Debts */}
            <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">{tr('debtAcc.debts')}</Text>
            {a.debts.length === 0 ? (
              <Text className="text-sm text-text-tertiary">{tr('debtAcc.noDebts')}</Text>
            ) : (
              a.debts.map((d) => (
                <View key={d.id} className="bg-surface rounded-xl p-3 border border-border-subtle gap-0.5">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-sm font-bold text-text-danger">
                      −{fmt(d.total)} {tr('common.som')}
                    </Text>
                    <Text className="text-xs text-text-tertiary">{fmtDate(d.createdAt)}</Text>
                  </View>
                  {d.lines.map((l, i) => (
                    <Text key={`${d.id}-${i}`} className="text-xs text-text-primary">
                      • {l.quantity} × {l.name} ({fmt(l.lineTotal)})
                    </Text>
                  ))}
                  {d.extraCharge > 0 ? (
                    <Text className="text-xs text-text-primary">• {tr('debtAcc.extraCharge', { amount: fmt(d.extraCharge) })}</Text>
                  ) : null}
                  {d.note ? <Text className="text-xs text-text-secondary italic mt-0.5">{d.note}</Text> : null}
                  {!d.stockDecremented ? (
                    <Text className="text-xs font-bold text-feedback-warning mt-0.5">{tr('debtAcc.notDecremented')}</Text>
                  ) : null}
                </View>
              ))
            )}

            {/* Timeline: Payments */}
            <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">{tr('debtAcc.payments')}</Text>
            {a.payments.length === 0 ? (
              <Text className="text-sm text-text-tertiary">{tr('debtAcc.noPayments')}</Text>
            ) : (
              a.payments.map((p) => (
                <View key={p.id} className="flex-row items-center justify-between bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                  <Text className="text-sm font-bold text-feedback-success">
                    +{fmt(p.amount)} {tr('common.som')}
                  </Text>
                  <Text className="text-xs text-text-tertiary">{fmtDate(p.createdAt)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
