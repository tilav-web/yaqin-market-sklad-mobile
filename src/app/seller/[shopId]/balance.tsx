import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useGlobalSearchParams } from 'expo-router';
import { ArrowDownCircle, Star } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { SellerWithdrawForm } from '@/components/seller/SellerWithdrawForm';
import { tr, useTranslation, type TranslationKey } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { colors } from '@/theme';

interface SellerBalance {
  pendingBalance: string;
  availableBalance: string;
  debtBalance: string;
  debtDueDate: string | null;
}
interface SellerTx {
  id: string;
  type: string;
  amount: string;
  status: string;
  description: string | null;
  createdAt: string;
}

const TX_LABEL: Record<string, TranslationKey> = {
  cash_order_commission: 'balance.txCashCommission',
  online_order_pending: 'balance.txOnlinePending',
  pending_settled: 'balance.txPendingSettled',
  debt_repaid: 'balance.txDebtRepaid',
  withdrawal_requested: 'balance.txWithdrawalRequested',
  withdrawal_completed: 'balance.txWithdrawalCompleted',
  prime_payment: 'balance.txPrimePayment',
  admin_adjustment: 'balance.txAdminAdjustment',
  refund_debit: 'balance.txRefundDebit',
};

function fmt(v: string): string {
  return Number(v).toLocaleString('ru-RU') + ' ' + tr('common.som');
}

export default function SellerBalanceScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const isOwner = useIsShopOwner(shopId);

  const balQ = useQuery<SellerBalance>({
    queryKey: ['seller-balance', shopId],
    staleTime: 60_000,
    enabled: isOwner !== false,
    queryFn: async () => (await api.get('/seller/balance')).data,
  });

  const txQ = useQuery<SellerTx[]>({
    queryKey: ['seller-txs', shopId],
    staleTime: 60_000,
    enabled: isOwner !== false,
    queryFn: async () => (await api.get('/seller/balance/transactions')).data,
  });

  const withdraw = useMutation({
    mutationFn: () =>
      api.post('/seller/balance/withdraw', {
        amount: parseAmount(amount),
        bankCardNumber: cardNum,
        bankCardHolderName: cardName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-balance'] });
      setShowWithdraw(false);
      setAmount('');
      setCardNum('');
      setCardName('');
      Alert.alert(tr('balance.requestSent'), tr('balance.requestSentDesc'));
    },
    onError: (e: unknown) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const bal = balQ.data;

  if (isOwner === false) {
    return <OwnerOnlyNotice />;
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 64 }}
        refreshControl={
          <RefreshControl
            refreshing={balQ.isFetching && !balQ.isLoading}
            onRefresh={() => {
              qc.invalidateQueries({ queryKey: ['seller-balance'] });
              qc.invalidateQueries({ queryKey: ['seller-txs'] });
            }}
          />
        }
      >
        {/* Balance cards */}
        {balQ.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} className="mt-6" />
        ) : balQ.isError ? (
          <Text className="text-sm text-red-500 text-center mt-6">
            {tr('balance.loadError')}
          </Text>
        ) : bal ? (
          <>
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-2xl p-4 bg-surface border border-border-subtle shadow-sm gap-1">
                <Text className="text-xs text-text-secondary">{tr('balance.available')}</Text>
                <Text className="text-xl font-extrabold text-emerald-600 mt-1">{fmt(bal.availableBalance)}</Text>
                <Text className="text-[11px] text-text-tertiary">{tr('balance.availableSub')}</Text>
              </View>
              <View className="flex-1 rounded-2xl p-4 bg-surface border border-border-subtle shadow-sm gap-1">
                <Text className="text-xs text-text-secondary">{tr('balance.pending')}</Text>
                <Text className="text-xl font-extrabold text-amber-500 mt-1">{fmt(bal.pendingBalance)}</Text>
                <Text className="text-[11px] text-text-tertiary">{tr('balance.pendingSub')}</Text>
              </View>
            </View>

            {parseFloat(bal.debtBalance) > 0 && (
              <View className="bg-red-50 rounded-2xl p-4 border border-red-300 gap-1">
                <Text className="text-sm font-bold text-red-700">
                  {tr('balance.debt', { amount: fmt(bal.debtBalance) })}
                </Text>
                {bal.debtDueDate && (
                  <Text className="text-xs text-red-600">
                    {tr('balance.debtDue', { date: bal.debtDueDate })}
                  </Text>
                )}
              </View>
            )}

            {/* Actions */}
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-brand-primary py-3 active:opacity-75"
                onPress={() => setShowWithdraw((v) => !v)}
              >
                <ArrowDownCircle size={20} color={colors.brand.primary} />
                <Text className="text-sm font-bold text-brand-primary">{tr('balance.withdraw')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-brand-primary py-3 active:opacity-75"
                onPress={() => router.push(`/seller/${shopId}/prime`)}
              >
                <Star size={20} color={colors.brand.primary} />
                <Text className="text-sm font-bold text-brand-primary">Prime</Text>
              </Pressable>
            </View>

            {/* Withdrawal form */}
            {showWithdraw && (
              <SellerWithdrawForm
                amount={amount}
                onChangeAmount={setAmount}
                cardNum={cardNum}
                onChangeCardNum={setCardNum}
                cardName={cardName}
                onChangeCardName={setCardName}
                onSubmit={() => withdraw.mutate()}
                isPending={withdraw.isPending}
              />
            )}
          </>
        ) : null}

        {/* Transaction history */}
        <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1 mt-2">
          {tr('balance.transactions')}
        </Text>
        {txQ.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} />
        ) : txQ.isError ? (
          <Text className="text-sm text-red-500 text-center">{tr('balance.historyError')}</Text>
        ) : (
          (txQ.data ?? []).map((tx) => {
            const isPositive = parseFloat(tx.amount) >= 0;
            return (
              <View key={tx.id} className="flex-row items-start gap-3 bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-text-primary">
                    {TX_LABEL[tx.type] ? tr(TX_LABEL[tx.type]) : tx.type}
                  </Text>
                  {tx.description && (
                    <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={2}>
                      {tx.description}
                    </Text>
                  )}
                  <Text className="text-[11px] text-text-tertiary mt-1">
                    {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}
                  </Text>
                </View>
                <Text className={`text-sm font-bold min-w-[90px] text-right ${
                  isPositive ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {isPositive ? '+' : ''}{fmt(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
        {!txQ.isLoading && (txQ.data ?? []).length === 0 && (
          <Text className="text-sm text-text-tertiary text-center py-6">{tr('balance.noTransactions')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
