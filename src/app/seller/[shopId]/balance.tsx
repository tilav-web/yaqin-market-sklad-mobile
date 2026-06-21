import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useGlobalSearchParams } from 'expo-router';
import { ArrowDownCircle, CreditCard, Star } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { colors, layout, radius, spacing, typography } from '@/theme';

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

const TX_LABEL: Record<string, string> = {
  cash_order_commission: 'Naqd buyurtma',
  online_order_pending: 'Online buyurtma (kutilmoqda)',
  pending_settled: 'Mablag chiqarildi',
  debt_repaid: 'Qarz to\'landi',
  withdrawal_requested: 'Yechish so\'rovi',
  withdrawal_completed: 'Yechildi',
  prime_payment: 'Prime obuna',
  admin_adjustment: 'Admin sozlash',
  refund_debit: 'Qaytarilgan mablag',
};

function fmt(v: string): string {
  return Number(v).toLocaleString('ru-RU') + " so'm";
}

export default function SellerBalanceScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardName, setCardName] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  const balQ = useQuery<SellerBalance>({
    queryKey: ['seller-balance', shopId],
    staleTime: 60_000,
    queryFn: async () => (await api.get('/seller/balance')).data,
  });

  const txQ = useQuery<SellerTx[]>({
    queryKey: ['seller-txs', shopId],
    staleTime: 60_000,
    queryFn: async () => (await api.get('/seller/balance/transactions')).data,
  });

  const withdraw = useMutation({
    mutationFn: () =>
      api.post('/seller/balance/withdraw', {
        amount: Number(amount),
        bankCardNumber: cardNum,
        bankCardHolderName: cardName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-balance'] });
      setShowWithdraw(false);
      setAmount('');
      setCardNum('');
      setCardName('');
      Alert.alert('So\'rov yuborildi', 'Admin ko\'rib chiqadi va kartangizga o\'tkazadi.');
    },
    onError: (e: unknown) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const bal = balQ.data;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 24 }} />
        ) : balQ.isError ? (
          <Text style={{ color: colors.feedback.danger, textAlign: 'center', marginTop: 24 }}>
            Balans ma'lumotlarini yuklashda xatolik
          </Text>
        ) : bal ? (
          <>
            <View style={styles.cards}>
              <View style={[styles.card, styles.cardAvailable]}>
                <Text style={styles.cardLabel}>Mavjud</Text>
                <Text style={[styles.cardValue, { color: colors.feedback.success }]}>{fmt(bal.availableBalance)}</Text>
                <Text style={styles.cardSub}>Yechish mumkin</Text>
              </View>
              <View style={[styles.card, styles.cardPending]}>
                <Text style={styles.cardLabel}>Kutilmoqda</Text>
                <Text style={[styles.cardValue, { color: '#F59E0B' }]}>{fmt(bal.pendingBalance)}</Text>
                <Text style={styles.cardSub}>24 soat ushlanadi</Text>
              </View>
            </View>

            {parseFloat(bal.debtBalance) > 0 && (
              <View style={styles.debtCard}>
                <Text style={styles.debtTitle}>Qarz: {fmt(bal.debtBalance)}</Text>
                {bal.debtDueDate && (
                  <Text style={styles.debtSub}>To'lov muddati: {bal.debtDueDate}</Text>
                )}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => setShowWithdraw((v) => !v)}>
                <ArrowDownCircle size={20} color={colors.brand.primary} />
                <Text style={styles.actionText}>Yechish</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => router.push(`/seller/${shopId}/prime`)}>
                <Star size={20} color={colors.brand.primary} />
                <Text style={styles.actionText}>Prime</Text>
              </Pressable>
            </View>

            {/* Withdrawal form */}
            {showWithdraw && (
              <View style={styles.withdrawForm}>
                <Text style={styles.sectionTitle}>Mablag' yechish</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Summa (so'm)"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholderTextColor={colors.text.tertiary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Karta raqami"
                  keyboardType="numeric"
                  value={cardNum}
                  onChangeText={setCardNum}
                  placeholderTextColor={colors.text.tertiary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Karta egasining ismi"
                  value={cardName}
                  onChangeText={setCardName}
                  placeholderTextColor={colors.text.tertiary}
                />
                <Pressable
                  style={[styles.submitBtn, withdraw.isPending && { opacity: 0.6 }]}
                  disabled={withdraw.isPending}
                  onPress={() => withdraw.mutate()}
                >
                  <CreditCard size={18} color="#fff" />
                  <Text style={styles.submitText}>So'rov yuborish</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : null}

        {/* Transaction history */}
        <Text style={styles.sectionTitle}>Tranzaksiyalar</Text>
        {txQ.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} />
        ) : txQ.isError ? (
          <Text style={{ color: colors.feedback.danger, textAlign: 'center' }}>
            Tarix yuklanmadi
          </Text>
        ) : (
          (txQ.data ?? []).map((tx) => {
            const isPositive = parseFloat(tx.amount) >= 0;
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txType}>{TX_LABEL[tx.type] ?? tx.type}</Text>
                  {tx.description && (
                    <Text style={styles.txDesc} numberOfLines={2}>{tx.description}</Text>
                  )}
                  <Text style={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: isPositive ? colors.feedback.success : colors.text.danger }]}>
                  {isPositive ? '+' : ''}{fmt(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
        {!txQ.isLoading && (txQ.data ?? []).length === 0 && (
          <Text style={styles.empty}>Tranzaksiyalar yo'q</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  cards: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardAvailable: { backgroundColor: colors.bg.surface },
  cardPending: { backgroundColor: colors.bg.surface },
  cardLabel: { ...typography.caption, color: colors.text.secondary },
  cardValue: { ...typography.h3, marginTop: 4 },
  cardSub: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  debtCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  debtTitle: { ...typography.bodyStrong, color: colors.text.danger },
  debtSub: { ...typography.caption, color: colors.text.danger, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    paddingVertical: spacing.sm,
  },
  actionText: { ...typography.bodyStrong, color: colors.brand.primary },
  withdrawForm: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: { ...typography.overline, color: colors.text.secondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text.primary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  submitText: { ...typography.bodyStrong, color: '#fff' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  txType: { ...typography.bodyStrong, color: colors.text.primary },
  txDesc: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  txDate: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  txAmount: { ...typography.bodyStrong, minWidth: 90, textAlign: 'right' },
  empty: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', paddingVertical: spacing.xl },
});
