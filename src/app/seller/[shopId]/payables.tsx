import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { HandCoins, Plus, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { CreatePayableModal } from '@/components/seller/CreatePayableModal';
import { PayableAccountModal } from '@/components/seller/PayableAccountModal';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { PAYABLE_CATEGORY_ICONS, PAYABLE_CATEGORY_LABEL_KEYS } from '@/lib/payableCategories';
import { PayableAccount, PayableSummary } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

export default function SellerPayablesScreen() {
  const { tr } = useTranslation();
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [presetAccount, setPresetAccount] = useState<{ id: string; name: string } | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['payables', shopId],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.get<PayableAccount[]>(`/seller/shops/${shopId}/payables`);
      return res.data;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['payables', shopId, 'summary'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await api.get<PayableSummary>(`/seller/shops/${shopId}/payables/summary`);
      return res.data;
    },
  });

  const openCreate = (account?: { id: string; name: string }) => {
    setPresetAccount(account ?? null);
    setActiveAccountId(null);
    setCreateOpen(true);
  };

  const summary = summaryQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={accountsQuery.data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={
              (accountsQuery.isFetching && !accountsQuery.isLoading) ||
              (summaryQuery.isFetching && !summaryQuery.isLoading)
            }
            onRefresh={() => {
              void accountsQuery.refetch();
              void summaryQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{tr('payables.totalLabel')}</Text>
            {summaryQuery.isLoading ? (
              <ActivityIndicator color={colors.text.onPrimary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            ) : summaryQuery.isError ? (
              <>
                <Text style={styles.summaryError}>{tr('payables.loadFailedShort')}</Text>
                <Pressable onPress={() => void summaryQuery.refetch()} hitSlop={8}>
                  <Text style={styles.summaryRetry}>{tr('common.retry')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.summaryValue}>
                  {fmt(summary?.outstanding ?? 0)} {tr('common.som')}
                </Text>
                <Text style={styles.summarySub}>
                  {tr('payables.creditorsCount', { n: summary?.creditors ?? 0 })}
                  {summary && summary.overdue > 0
                    ? ` · ${tr('payables.overdueSuffix', { n: summary.overdue })}`
                    : ''}
                </Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          accountsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : accountsQuery.isError ? (
            <EmptyState
              icon={WifiOff}
              title={tr('payables.accountsLoadFailed')}
              description={tr('payables.accountsLoadFailedDesc')}
              actionLabel={tr('common.retry')}
              onAction={() => void accountsQuery.refetch()}
            />
          ) : (
            <EmptyState
              icon={HandCoins}
              title={tr('payables.emptyTitle')}
              description={tr('payables.emptyDesc')}
            />
          )
        }
        renderItem={({ item }) => {
          const due = item.balance > 0;
          const overdue = due && isOverdue(item.nearestDueDate);
          const Icon = PAYABLE_CATEGORY_ICONS[item.category];
          return (
            <Pressable style={styles.row} onPress={() => setActiveAccountId(item.id)}>
              <View style={styles.avatar}>
                <Icon size={22} color={colors.brand.primary} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta}>
                  {tr(PAYABLE_CATEGORY_LABEL_KEYS[item.category])}
                  {overdue ? ` · ${tr('payables.overdueTag')}` : ''}
                </Text>
              </View>
              <View style={styles.balanceWrap}>
                <Text
                  style={[
                    styles.balance,
                    { color: due ? (overdue ? colors.text.danger : colors.text.primary) : colors.feedback.success },
                  ]}>
                  {fmt(item.balance)}
                </Text>
                <Text style={styles.balanceUnit}>
                  {due ? tr('payables.debt') : tr('payables.closed')}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => openCreate()}>
        <Plus size={22} color={colors.text.onPrimary} strokeWidth={2.8} />
        <Text style={styles.fabText}>{tr('payables.newPayable')}</Text>
      </Pressable>

      <CreatePayableModal
        visible={createOpen}
        shopId={shopId}
        accounts={accountsQuery.data ?? []}
        presetAccountId={presetAccount?.id}
        presetAccountName={presetAccount?.name}
        onClose={() => setCreateOpen(false)}
      />

      <PayableAccountModal
        visible={!!activeAccountId}
        shopId={shopId}
        accountId={activeAccountId}
        onClose={() => setActiveAccountId(null)}
        onAddCharge={(id, name) => openCreate({ id, name })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, paddingBottom: 96, gap: spacing.sm },
  summaryCard: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  summaryLabel: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)' },
  summaryValue: { ...typography.h1, color: colors.text.onPrimary, marginTop: 2 },
  summarySub: { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  summaryError: { ...typography.bodyStrong, color: colors.text.onPrimary, marginTop: 4 },
  summaryRetry: {
    ...typography.caption,
    color: colors.text.onPrimary,
    fontWeight: '800',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.bodyStrong, color: colors.text.primary },
  meta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  balanceWrap: { alignItems: 'flex-end' },
  balance: { ...typography.h4 },
  balanceUnit: { ...typography.caption, color: colors.text.tertiary },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    ...shadow.lg,
  },
  fabText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
});
