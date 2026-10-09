import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { Check, Package, ScanLine, Truck } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DONE,
  Filter,
  NEXT_STATUS,
  NO_ORDERS,
  PROGRESS,
  SellerDeliveryRouteModal,
  SellerOrderCard,
  SellerOrderFilterSegments,
} from '@/components/seller-orders';
import { EmptyState, useToast } from '@/components/ui';
import { useAdvanceOrderStatus } from '@/hooks/use-advance-order-status';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { DeliveryRoute, Order, OrderStatus } from '@/lib/types';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { useShopRealtime } from '@/lib/useShopRealtime';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function SellerOrdersScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('new');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [routeOpen, setRouteOpen] = useState(false);
  const access = useShopAccess(shopId);

  const ordersQuery = useQuery({
    queryKey: ['seller-orders', shopId],
    staleTime: 20_000,
    queryFn: async () => {
      const res = await api.get<Order[]>(`/seller/shops/${shopId}/orders`);
      return res.data;
    },
    refetchInterval: 20_000,
  });

  useFocusEffect(
    useCallback(() => {
      api
        .post(`/seller/shops/${shopId}/orders/seen`)
        .then(() => {
          qc.setQueryData<import('@/lib/types').MyShop[]>(['shops', 'mine'], (shops) =>
            shops?.map((s) => (s.id === shopId ? { ...s, newOrderCount: 0 } : s)),
          );
        })
        .catch(() => {});
    }, [shopId, qc]),
  );

  const onNewOrder = useCallback(() => {
    haptics.success();
    toast.show(tr('sellerOrders.newArrived'), { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['seller-orders', shopId] });
  }, [toast, qc, shopId, tr]);
  useShopRealtime(shopId, onNewOrder);

  const advance = useAdvanceOrderStatus({
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders', shopId] }),
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const all = ordersQuery.data ?? NO_ORDERS;
  const counts = useMemo(
    () => ({
      new: all.filter((o) => o.status === 'new').length,
      progress: all.filter((o) => PROGRESS.includes(o.status)).length,
      done: all.filter((o) => DONE.includes(o.status)).length,
    }),
    [all],
  );

  const orders = useMemo(() => {
    if (filter === 'new') return all.filter((o) => o.status === 'new');
    if (filter === 'progress') return all.filter((o) => PROGRESS.includes(o.status));
    return all.filter((o) => DONE.includes(o.status));
  }, [all, filter]);

  const routeQuery = useQuery({
    queryKey: ['delivery-route', shopId],
    queryFn: async () => {
      const res = await api.get<DeliveryRoute>(`/seller/shops/${shopId}/orders/delivery-route`);
      return res.data;
    },
    enabled: routeOpen,
    staleTime: 30_000,
  });

  const deliveringCount = all.filter((o) => o.status === 'delivering').length;
  const canSeeRoute = deliveringCount >= 2 && access.has('orders.view_assigned');

  const EMPTY_MSG: Record<Filter, { title: string; desc: string }> = {
    new: { title: tr('sellerOrders.emptyNew'), desc: tr('sellerOrders.emptyNewDesc') },
    progress: { title: tr('sellerOrders.emptyProgress'), desc: tr('sellerOrders.emptyProgressDesc') },
    done: { title: tr('sellerOrders.emptyDone'), desc: tr('sellerOrders.emptyDoneDesc') },
  };

  const handleCancelOrReject = (item: Order) => {
    const isNew = item.status === 'new';
    const nextStatus: OrderStatus = isNew ? 'seller_rejected' : 'cancelled';
    Alert.alert(
      isNew ? 'Buyurtmani rad etish' : tr('orders.cancel'),
      isNew
        ? `#${item.orderNumber} rad etilsinmi?`
        : tr('orders.cancelConfirmNum', { n: item.orderNumber }),
      [
        { text: tr('common.no'), style: 'cancel' },
        {
          text: tr('common.yes'),
          style: 'destructive',
          onPress: () => advance.mutate({ orderId: item.id, status: nextStatus }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filters + Route Button */}
      <SellerOrderFilterSegments
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        canSeeRoute={canSeeRoute}
        deliveringCount={deliveringCount}
        onOpenRoute={() => setRouteOpen(true)}
      />

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isFetching && !ordersQuery.isLoading}
            onRefresh={() => {
              void ordersQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <ActivityIndicator
              color={colors.brand.primary}
              style={{ marginTop: spacing['4xl'] }}
            />
          ) : (
            <EmptyState
              icon={filter === 'done' ? Check : filter === 'progress' ? Truck : Package}
              title={EMPTY_MSG[filter].title}
              description={EMPTY_MSG[filter].desc}
            />
          )
        }
        renderItem={({ item }) => (
          <SellerOrderCard
            item={item}
            isOpen={!!expanded[item.id]}
            onToggleOpen={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
            onCancelOrReject={handleCancelOrReject}
            onAdvance={(order) => {
              haptics.medium();
              const next = NEXT_STATUS[order.status]?.next;
              if (next) {
                advance.mutate({
                  orderId: order.id,
                  status: next,
                  deliveryAddress: order.deliveryAddress,
                });
              }
            }}
            shopId={shopId}
          />
        )}
      />

      {/* In-store sale (POS) */}
      <Pressable style={styles.fab} onPress={() => router.push(`/seller/pos/${shopId}`)}>
        <ScanLine size={20} color={colors.text.onPrimary} strokeWidth={2.5} />
        <Text style={styles.fabText}>{tr('sellerOrders.sell')}</Text>
      </Pressable>

      {/* Delivery Route Modal */}
      <SellerDeliveryRouteModal
        visible={routeOpen}
        onClose={() => setRouteOpen(false)}
        route={routeQuery.data}
        isLoading={routeQuery.isLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  list: {
    padding: layout.screenPadding,
    paddingBottom: 96,
    gap: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    ...shadow.lg,
  },
  fabText: {
    ...typography.body,
    fontWeight: '800',
    color: colors.text.onPrimary,
  },
});
