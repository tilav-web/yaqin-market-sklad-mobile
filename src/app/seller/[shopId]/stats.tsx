import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { AlertTriangle, CalendarClock, Package, ShoppingBag, TrendingUp, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { ExpiringItem, ReorderItem, SellerStats, StatsPeriod } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: 'today', label: 'Bugun' },
  { key: '7d', label: '7 kun' },
  { key: '30d', label: '30 kun' },
];

export default function SellerStatsScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const [period, setPeriod] = useState<StatsPeriod>('7d');

  const statsQuery = useQuery({
    queryKey: ['stats', shopId, period],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await api.get<SellerStats>(`/seller/shops/${shopId}/analytics/stats?period=${period}`);
      return res.data;
    },
  });

  const reorderQuery = useQuery({
    queryKey: ['reorder', shopId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await api.get<ReorderItem[]>(`/seller/shops/${shopId}/analytics/reorder`);
      return res.data;
    },
  });

  const expiringQuery = useQuery({
    queryKey: ['expiring', shopId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await api.get<ExpiringItem[]>(`/seller/shops/${shopId}/analytics/expiring?days=30`);
      return res.data;
    },
  });

  const s = statsQuery.data;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={
              (statsQuery.isFetching && !statsQuery.isLoading) ||
              (reorderQuery.isFetching && !reorderQuery.isLoading) ||
              (expiringQuery.isFetching && !expiringQuery.isLoading)
            }
            onRefresh={() => {
              void statsQuery.refetch();
              void reorderQuery.refetch();
              void expiringQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }>
        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <Text
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodChip, period === p.key && styles.periodChipActive]}>
              {p.label}
            </Text>
          ))}
        </View>

        {statsQuery.isLoading || !s ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* KPI cards */}
            <View style={styles.kpiGrid}>
              <Kpi icon={Wallet} label="Tushum" value={`${fmt(s.revenue)}`} unit="so'm" tone="primary" />
              <Kpi icon={TrendingUp} label="Foyda" value={`${fmt(s.profit)}`} unit="so'm" tone="success" />
              <Kpi icon={ShoppingBag} label="Buyurtmalar" value={`${s.orderCount}`} unit="ta" />
              <Kpi icon={Package} label="Sotilgan" value={`${s.itemsSold}`} unit="dona" />
            </View>

            <View style={styles.invCard}>
              <Text style={styles.invLabel}>Ombor qiymati (tannarxda)</Text>
              <Text style={styles.invValue}>{fmt(s.inventoryValue)} so&apos;m</Text>
            </View>

            {/* Top products */}
            <Section title="Eng ko'p sotilganlar">
              {s.topProducts.length === 0 ? (
                <Text style={styles.dim}>Bu davrda sotuv yo&apos;q</Text>
              ) : (
                s.topProducts.map((t, i) => (
                  <View key={t.name} style={styles.topRow}>
                    <Text style={styles.topRank}>{i + 1}</Text>
                    <Text style={styles.topName} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <View style={styles.topRight}>
                      <Text style={styles.topQty}>{t.qty} dona</Text>
                      <Text style={styles.topRevenue}>{fmt(t.revenue)} so&apos;m</Text>
                    </View>
                  </View>
                ))
              )}
            </Section>
          </>
        )}

        {/* Reorder suggestions */}
        <Section title="🛒 Olib kelish kerak" hint="Sotuv tezligi va kam qoldiq asosida">
          {reorderQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 12 }} />
          ) : (reorderQuery.data ?? []).length === 0 ? (
            <Text style={styles.dim}>Hammasi yetarli — olib kelish shart emas 👍</Text>
          ) : (
            (reorderQuery.data ?? []).map((r) => (
              <View key={r.variantId} style={styles.reorderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reorderName} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.reorderMeta}>
                    Qoldiq {r.stock} ta
                    {r.daysLeft !== null ? ` · ~${r.daysLeft} kunga yetadi` : ' · sekin sotiladi'}
                    {r.perDay > 0 ? ` · kuniga ${r.perDay}` : ''}
                  </Text>
                </View>
                <View style={styles.suggestBadge}>
                  <Text style={styles.suggestQty}>+{r.suggestedQty}</Text>
                  <Text style={styles.suggestLabel}>tavsiya</Text>
                </View>
              </View>
            ))
          )}
        </Section>

        {/* Expiring */}
        <Section title="📅 Muddati tugayotganlar" hint="30 kun ichida">
          {expiringQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 12 }} />
          ) : (expiringQuery.data ?? []).length === 0 ? (
            <Text style={styles.dim}>Yaqin orada muddati tugaydigan tovar yo&apos;q</Text>
          ) : (
            (expiringQuery.data ?? []).map((e) => {
              const expired = e.daysToExpiry < 0;
              const urgent = e.daysToExpiry <= 7;
              return (
                <View key={e.batchId} style={styles.expRow}>
                  <View style={[styles.expIcon, (expired || urgent) && styles.expIconUrgent]}>
                    {expired ? (
                      <AlertTriangle size={15} color={colors.text.danger} strokeWidth={2.3} />
                    ) : (
                      <CalendarClock size={15} color={urgent ? colors.feedback.warning : colors.text.secondary} strokeWidth={2.2} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expName} numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text style={styles.expMeta}>
                      {e.quantityRemaining} ta · {e.expiryDate}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.expDays,
                      expired ? styles.expDaysDanger : urgent ? styles.expDaysWarn : null,
                    ]}>
                    {expired ? `${-e.daysToExpiry} kun o'tdi` : `${e.daysToExpiry} kun`}
                  </Text>
                </View>
              );
            })
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  unit: string;
  tone?: 'primary' | 'success';
}) {
  const color =
    tone === 'success' ? colors.feedback.success : tone === 'primary' ? colors.brand.primary : colors.text.primary;
  return (
    <View style={styles.kpi}>
      <Icon size={18} color={color} strokeWidth={2.2} />
      <Text style={[styles.kpiValue, { color }]} numberOfLines={1}>
        {value} <Text style={styles.kpiUnit}>{unit}</Text>
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={{ marginTop: spacing.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  periodRow: { flexDirection: 'row', gap: spacing.sm },
  periodChip: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  periodChipActive: {
    color: colors.text.onPrimary,
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpi: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    gap: 4,
    ...shadow.xs,
  },
  kpiValue: { ...typography.h4 },
  kpiUnit: { ...typography.caption, fontWeight: '600' },
  kpiLabel: { ...typography.caption, color: colors.text.secondary },
  invCard: {
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  invLabel: { ...typography.caption, color: colors.text.secondary },
  invValue: { ...typography.h4, color: colors.brand.primary },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
  },
  sectionTitle: { ...typography.bodyStrong, color: colors.text.primary },
  sectionHint: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  dim: { ...typography.bodySmall, color: colors.text.tertiary, paddingVertical: spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  topRank: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.brand.primary,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  topName: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  topRight: { alignItems: 'flex-end' },
  topQty: { ...typography.caption, fontWeight: '700', color: colors.text.primary },
  topRevenue: { ...typography.caption, color: colors.text.secondary },
  reorderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  reorderName: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary },
  reorderMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  suggestBadge: { alignItems: 'center', backgroundColor: colors.feedback.successSurface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  suggestQty: { ...typography.bodyStrong, color: colors.feedback.success, fontWeight: '800' },
  suggestLabel: { ...typography.caption, color: colors.feedback.success, fontSize: 10 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  expIcon: { width: 30, height: 30, borderRadius: radius.full, backgroundColor: colors.bg.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  expIconUrgent: { backgroundColor: colors.feedback.dangerSurface },
  expName: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary },
  expMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  expDays: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  expDaysWarn: { color: colors.feedback.warning },
  expDaysDanger: { color: colors.text.danger },
});
