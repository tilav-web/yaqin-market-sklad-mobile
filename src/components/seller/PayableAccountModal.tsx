import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpCircle, Plus, WifiOff, X } from 'lucide-react-native';
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
import { PAYABLE_CATEGORY_LABEL_KEYS } from '@/lib/payableCategories';
import { PayableAccountDetail } from '@/lib/types';
import { colors } from '@/theme';

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
      <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <View className="flex-1">
            <Text className="text-xl font-bold text-text-primary" numberOfLines={1}>
              {d?.account.name ?? tr('payableAcc.creditor')}
            </Text>
            <Text className="text-xs text-text-secondary">{d ? tr(PAYABLE_CATEGORY_LABEL_KEYS[d.account.category]) : ''}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        {accountQuery.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
        ) : accountQuery.isError || !d ? (
          <EmptyState
            icon={WifiOff}
            title={tr('payableAcc.loadFailed')}
            description={tr('common.error.desc')}
            actionLabel={tr('common.retry')}
            onAction={() => void accountQuery.refetch()}
          />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
            {/* Balance */}
            <View
              className={`rounded-2xl p-5 border items-center gap-0.5 ${
                d.balance > 0
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20'
              }`}>
              <Text className="text-xs text-text-secondary">{tr('payableAcc.remaining')}</Text>
              <Text
                className={`text-3xl font-extrabold ${d.balance > 0 ? 'text-text-danger' : 'text-feedback-success'}`}>
                {fmt(d.balance)} {tr('common.som')}
              </Text>
              <Text className="text-xs text-text-secondary">
                {tr('payableAcc.totalsMeta', { taken: fmt(d.totalCharged), paid: fmt(d.totalPaid) })}
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl border border-feedback-success bg-feedback-success/5"
                onPress={() => setPayOpen((v) => !v)}>
                <ArrowUpCircle size={18} color={colors.feedback.success} strokeWidth={2.3} />
                <Text className="text-xs font-bold text-feedback-success">{tr('payableAcc.makePayment')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-brand-primary"
                onPress={() => onAddCharge(d.account.id, d.account.name)}>
                <Plus size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
                <Text className="text-xs font-bold text-white">{tr('payableAcc.addCharge')}</Text>
              </Pressable>
            </View>

            {payOpen ? (
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="number-pad"
                  placeholder={tr('payableAcc.amountPh')}
                  placeholderTextColor={colors.text.hint}
                  autoFocus
                />
                <Pressable
                  className={`px-5 rounded-xl items-center justify-center ${
                    parseAmount(payAmount) && !pay.isPending ? 'bg-feedback-success' : 'bg-surface-disabled'
                  }`}
                  disabled={!parseAmount(payAmount) || pay.isPending}
                  onPress={() => pay.mutate()}>
                  <Text className="text-sm font-bold text-white">{pay.isPending ? '…' : tr('payableAcc.pay')}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Timeline: Charges */}
            <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">{tr('payableAcc.charges')}</Text>
            {d.charges.length === 0 ? (
              <Text className="text-sm text-text-tertiary">{tr('payableAcc.noCharges')}</Text>
            ) : (
              d.charges.map((c) => (
                <View key={c.id} className="bg-surface rounded-xl p-3 border border-border-subtle gap-0.5">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-sm font-bold text-text-danger">
                      −{fmt(c.amount)} {tr('common.som')}
                    </Text>
                    <Text className="text-xs text-text-tertiary">{fmtDate(c.createdAt)}</Text>
                  </View>
                  {c.description ? <Text className="text-xs text-text-primary">{c.description}</Text> : null}
                  {c.dueDate ? (
                    <Text className="text-xs font-bold text-feedback-warning mt-0.5">{tr('payableAcc.dueDate', { date: c.dueDate })}</Text>
                  ) : null}
                  {c.note ? <Text className="text-xs text-text-secondary italic mt-0.5">{c.note}</Text> : null}
                </View>
              ))
            )}

            {/* Timeline: Payments */}
            <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">{tr('payableAcc.payments')}</Text>
            {d.payments.length === 0 ? (
              <Text className="text-sm text-text-tertiary">{tr('payableAcc.noPayments')}</Text>
            ) : (
              d.payments.map((p) => (
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
