import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { NotebookText, Plus, UserCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreateDebtModal } from '@/components/seller/CreateDebtModal';
import { DebtAccountModal } from '@/components/seller/DebtAccountModal';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { DebtAccount, DebtSummary } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function SellerDebtScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const [createOpen, setCreateOpen] = useState(false);
  const [preset, setPreset] = useState<{ name: string; phone: string } | null>(null);
  const [activePhone, setActivePhone] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['debts', shopId],
    queryFn: async () => {
      const res = await api.get<DebtAccount[]>(`/seller/shops/${shopId}/debts`);
      return res.data;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['debts', shopId, 'summary'],
    queryFn: async () => {
      const res = await api.get<DebtSummary>(`/seller/shops/${shopId}/debts/summary`);
      return res.data;
    },
  });

  const openCreate = (name?: string, phone?: string) => {
    setPreset(name && phone ? { name, phone } : null);
    setActivePhone(null);
    setCreateOpen(true);
  };

  const summary = summaryQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={accountsQuery.data ?? []}
        keyExtractor={(a) => a.customerPhone}
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
            <Text style={styles.summaryLabel}>Umumiy qarz (olinishi kerak)</Text>
            <Text style={styles.summaryValue}>{fmt(summary?.outstanding ?? 0)} so&apos;m</Text>
            <Text style={styles.summarySub}>{summary?.customers ?? 0} ta mijozda qarz bor</Text>
          </View>
        }
        ListEmptyComponent={
          accountsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon={NotebookText}
              title="Qarz daftari bo‘sh"
              description="Tanishlaringizga qarzga sotgan tovarlaringizni shu yerda yuriting"
            />
          )
        }
        renderItem={({ item }) => {
          const due = item.balance > 0;
          return (
            <Pressable style={styles.row} onPress={() => setActivePhone(item.customerPhone)}>
              <View style={styles.avatar}>
                <UserCircle2 size={26} color={colors.brand.primary} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.customerName || 'Mijoz'}
                </Text>
                <Text style={styles.phone}>{item.customerPhone}</Text>
              </View>
              <View style={styles.balanceWrap}>
                <Text style={[styles.balance, { color: due ? colors.text.danger : colors.feedback.success }]}>
                  {fmt(item.balance)}
                </Text>
                <Text style={styles.balanceUnit}>{due ? 'qarz' : 'yopiq'}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => openCreate()}>
        <Plus size={22} color={colors.text.onPrimary} strokeWidth={2.8} />
        <Text style={styles.fabText}>Yangi qarz</Text>
      </Pressable>

      <CreateDebtModal
        visible={createOpen}
        shopId={shopId}
        presetName={preset?.name}
        presetPhone={preset?.phone}
        onClose={() => setCreateOpen(false)}
      />

      <DebtAccountModal
        visible={!!activePhone}
        shopId={shopId}
        phone={activePhone}
        onClose={() => setActivePhone(null)}
        onAddDebt={(name, phone) => {
          setActivePhone(null);
          openCreate(name, phone);
        }}
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
  phone: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
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
