import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { AlertTriangle, CalendarClock, Package, ShoppingBag, TrendingUp, Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { EmptyState } from '@/components/ui';
import { useTranslation, type TranslationKey } from '@/i18n';
import { api } from '@/lib/api';
import { ExpiringItem, ReorderItem, SellerStats, StatsPeriod } from '@/lib/types';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { colors } from '@/theme';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

const PERIODS: { key: StatsPeriod; label: TranslationKey }[] = [
  { key: 'today', label: 'stats.periodToday' },
  { key: '7d', label: 'stats.period7d' },
  { key: '30d', label: 'stats.period30d' },
];

export default function SellerStatsScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const [period, setPeriod] = useState<StatsPeriod>('7d');
  const isOwner = useIsShopOwner(shopId);

  const statsQuery = useQuery({
    queryKey: ['stats', shopId, period],
    staleTime: 5 * 60_000,
    enabled: isOwner !== false,
    queryFn: async () => {
      const res = await api.get<SellerStats>(`/seller/shops/${shopId}/analytics/stats?period=${period}`);
      return res.data;
    },
  });

  const reorderQuery = useQuery({
    queryKey: ['reorder', shopId],
    staleTime: 5 * 60_000,
    enabled: isOwner !== false,
    queryFn: async () => {
      const res = await api.get<ReorderItem[]>(`/seller/shops/${shopId}/analytics/reorder`);
      return res.data;
    },
  });

  const expiringQuery = useQuery({
    queryKey: ['expiring', shopId],
    staleTime: 5 * 60_000,
    enabled: isOwner !== false,
    queryFn: async () => {
      const res = await api.get<ExpiringItem[]>(`/seller/shops/${shopId}/analytics/expiring?days=30`);
      return res.data;
    },
  });

  if (isOwner === false) {
    return <OwnerOnlyNotice />;
  }

  const s = statsQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
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
        <View className="flex-row gap-2">
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPeriod(p.key)}
                className={`px-4 py-2 rounded-full border ${
                  active ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border-default'
                }`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-text-secondary'}`}>
                  {tr(p.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {statsQuery.isLoading ? (
          <ActivityIndicator color={colors.brand.primary} className="mt-10" />
        ) : statsQuery.isError || !s ? (
          <EmptyState
            icon={AlertTriangle}
            title={tr('stats.loadErrorTitle')}
            description={tr('stats.loadErrorDesc')}
            actionLabel={tr('common.retry')}
            onAction={() => void statsQuery.refetch()}
          />
        ) : (
          <>
            {/* KPI cards */}
            <View className="flex-row flex-wrap gap-3">
              <KpiCard icon={Wallet} label={tr('stats.revenue')} value={fmt(s.revenue)} unit={tr('common.som')} tone="primary" />
              <KpiCard icon={TrendingUp} label={tr('stats.profit')} value={fmt(s.profit)} unit={tr('common.som')} tone="success" />
              <KpiCard icon={ShoppingBag} label={tr('stats.orders')} value={`${s.orderCount}`} unit={tr('stats.unitPcs')} />
              <KpiCard icon={Package} label={tr('stats.sold')} value={`${s.itemsSold}`} unit={tr('stats.unitItems')} />
            </View>

            <View className="bg-brand-primary-surface rounded-2xl p-4 border border-brand-primary/30">
              <Text className="text-xs text-text-secondary">{tr('stats.inventoryValue')}</Text>
              <Text className="text-lg font-bold text-brand-primary mt-0.5">
                {fmt(s.inventoryValue)} {tr('common.som')}
              </Text>
            </View>

            {/* Top products */}
            <View className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm gap-2">
              <Text className="text-sm font-bold text-text-primary">{tr('stats.topProducts')}</Text>
              {s.topProducts.length === 0 ? (
                <Text className="text-xs text-text-tertiary py-2">{tr('stats.noSales')}</Text>
              ) : (
                s.topProducts.map((t, i) => (
                  <View key={t.name} className="flex-row items-center gap-2.5 py-2 border-b border-border-subtle">
                    <View className="w-5 h-5 rounded-full bg-brand-primary-surface items-center justify-center">
                      <Text className="text-[10px] font-extrabold text-brand-primary">{i + 1}</Text>
                    </View>
                    <Text className="text-xs text-text-primary flex-1 font-medium" numberOfLines={1}>
                      {t.name}
                    </Text>
                    <View className="items-end">
                      <Text className="text-xs font-bold text-text-primary">{t.qty} {tr('stats.unitItems')}</Text>
                      <Text className="text-[11px] text-text-secondary">{fmt(t.revenue)} {tr('common.som')}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* Reorder suggestions */}
        <View className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm gap-2">
          <View>
            <Text className="text-sm font-bold text-text-primary">{tr('stats.reorderTitle')}</Text>
            <Text className="text-xs text-text-tertiary mt-0.5">{tr('stats.reorderHint')}</Text>
          </View>
          {reorderQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} className="my-3" />
          ) : (reorderQuery.data ?? []).length === 0 ? (
            <Text className="text-xs text-text-tertiary py-2">{tr('stats.reorderEmpty')}</Text>
          ) : (
            (reorderQuery.data ?? []).map((r) => (
              <View key={r.variantId} className="flex-row items-center gap-3 py-2 border-b border-border-subtle">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text className="text-[11px] text-text-secondary mt-0.5">
                    {tr('stats.stockLeft', { n: r.stock })}
                    {r.daysLeft !== null
                      ? ` · ${tr('stats.daysEnough', { d: r.daysLeft })}`
                      : ` · ${tr('stats.slowSelling')}`}
                    {r.perDay > 0 ? ` · ${tr('stats.perDay', { n: r.perDay })}` : ''}
                  </Text>
                </View>
                <View className="items-center bg-emerald-50 rounded-xl px-3 py-1 border border-emerald-200">
                  <Text className="text-xs font-extrabold text-emerald-700">+{r.suggestedQty}</Text>
                  <Text className="text-[9px] font-bold text-emerald-600">{tr('stats.suggested')}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Expiring */}
        <View className="bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm gap-2">
          <View>
            <Text className="text-sm font-bold text-text-primary">{tr('stats.expiringTitle')}</Text>
            <Text className="text-xs text-text-tertiary mt-0.5">{tr('stats.expiringHint')}</Text>
          </View>
          {expiringQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} className="my-3" />
          ) : (expiringQuery.data ?? []).length === 0 ? (
            <Text className="text-xs text-text-tertiary py-2">{tr('stats.expiringEmpty')}</Text>
          ) : (
            (expiringQuery.data ?? []).map((e) => {
              const expired = e.daysToExpiry < 0;
              const urgent = e.daysToExpiry <= 7;
              return (
                <View key={e.batchId} className="flex-row items-center gap-2.5 py-2 border-b border-border-subtle">
                  <View className={`w-8 h-8 rounded-full items-center justify-center ${
                    expired || urgent ? 'bg-red-50' : 'bg-surface-muted'
                  }`}>
                    {expired ? (
                      <AlertTriangle size={15} color={colors.text.danger} strokeWidth={2.3} />
                    ) : (
                      <CalendarClock size={15} color={urgent ? colors.feedback.warning : colors.text.secondary} strokeWidth={2.2} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-text-primary" numberOfLines={1}>
                      {e.name}
                    </Text>
                    <Text className="text-[11px] text-text-secondary mt-0.5">
                      {e.quantityRemaining} {tr('stats.unitPcs')} · {e.expiryDate}
                    </Text>
                  </View>
                  <Text
                    className={`text-xs font-bold ${
                      expired ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-text-secondary'
                    }`}
                  >
                    {expired
                      ? tr('stats.daysPassed', { n: -e.daysToExpiry })
                      : tr('stats.daysLeft', { n: e.daysToExpiry })}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({
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
  const iconColor =
    tone === 'success' ? colors.feedback.success : tone === 'primary' ? colors.brand.primary : colors.text.primary;
  return (
    <View className="flex-1 min-w-[45%] bg-surface rounded-2xl border border-border-subtle p-3.5 gap-1 shadow-sm">
      <Icon size={18} color={iconColor} strokeWidth={2.2} />
      <Text className="text-lg font-bold text-text-primary mt-1" numberOfLines={1}>
        {value} <Text className="text-xs font-normal text-text-secondary">{unit}</Text>
      </Text>
      <Text className="text-xs text-text-secondary">{label}</Text>
    </View>
  );
}
