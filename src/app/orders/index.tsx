import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Banknote, ChevronRight, CreditCard, Navigation, Package, Store, WifiOff } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { useIsGuest } from '@/lib/useRequireAuth';
import { ORDER_STATUS_KEY, Order, OrderStatus } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { layout, radius, spacing, typography } from '@/theme';

const ACTIVE_STATUSES: OrderStatus[] = ['new', 'accepted', 'preparing', 'delivering'];

function paymentInfo(
  order: Order,
  tr: ReturnType<typeof useTranslation>['tr'],
  colors: ReturnType<typeof useTheme>['colors'],
): { label: string; color: string; Icon: typeof CreditCard } {
  if (order.paymentMethod === 'cash') {
    return { label: tr('orders.paymentCash'), color: colors.text.tertiary, Icon: Banknote };
  }
  if (order.paymentStatus === 'paid') {
    return { label: tr('orders.paymentPaid'), color: colors.feedback.success, Icon: CreditCard };
  }
  if (order.paymentStatus === 'failed') {
    return { label: tr('orders.paymentFailed'), color: colors.feedback.danger, Icon: CreditCard };
  }
  return { label: tr('orders.paymentPending'), color: colors.feedback.warning, Icon: CreditCard };
}

export default function OrdersScreen() {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const isGuest = useIsGuest();
  const ordersQuery = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders/mine');
      return res.data;
    },
    enabled: !isGuest,
    refetchInterval: 30_000,
  });

  const activeCount = (ordersQuery.data ?? []).filter((o) => ACTIVE_STATUSES.includes(o.status)).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: activeColors.bg.canvas }} edges={['bottom']}>
      {activeCount > 0 ? (
        <Pressable
          style={[
            styles.trackingBanner,
            {
              backgroundColor: activeColors.brand.primarySurface,
              borderColor: activeColors.brand.primaryBorder,
            },
          ]}
          onPress={() => router.push('/orders/tracking')}>
          <View style={[styles.trackingIconWrap, { backgroundColor: activeColors.brand.primary }]}>
            <Navigation size={16} color={activeColors.text.onPrimary} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trackingTitle, { color: activeColors.text.primary }]}>{tr('tracking.title')}</Text>
            <Text style={[styles.trackingSubtitle, { color: activeColors.text.secondary }]}>{tr('tracking.bannerDesc', { n: activeCount })}</Text>
          </View>
          <ChevronRight size={18} color={activeColors.brand.primary} />
        </Pressable>
      ) : null}
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isGuest ? (
            <EmptyState
              icon={Package}
              title={tr('profile.guest.title')}
              description={tr('auth.requireMessage')}
              actionLabel={tr('auth.loginAction')}
              onAction={() => router.push('/(auth)/phone')}
            />
          ) : ordersQuery.isLoading ? (
            <ActivityIndicator color={activeColors.brand.primary} style={{ marginTop: spacing['4xl'] }} />
          ) : ordersQuery.isError ? (
            <EmptyState
              icon={WifiOff}
              title={tr('common.error.title')}
              description={tr('common.error.desc')}
              actionLabel={tr('common.retry')}
              onAction={() => void ordersQuery.refetch()}
            />
          ) : (
            <EmptyState icon={Package} title={tr('orders.empty')} description={tr('orders.emptyDesc')} />
          )
        }
        renderItem={({ item }) => {
          const payment = paymentInfo(item, tr, activeColors);
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: activeColors.bg.surface,
                  borderColor: activeColors.border.subtle,
                },
                pressed && { opacity: 0.9 },
              ]}
              onPress={() => router.push(`/orders/${item.id}`)}>
              <View style={styles.cardHeader}>
                <Text style={[styles.orderNumber, { color: activeColors.text.secondary }]}>#{item.orderNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: activeColors.status[item.status] }]}>
                  <Text style={[styles.statusText, { color: activeColors.text.onPrimary }]}>{tr(ORDER_STATUS_KEY[item.status])}</Text>
                </View>
              </View>
              <View style={styles.shopRow}>
                <Store size={14} color={activeColors.text.tertiary} strokeWidth={2.4} />
                <Text style={[styles.shopName, { color: activeColors.text.primary }]} numberOfLines={1}>
                  {item.shop?.name ?? '…'}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <payment.Icon size={13} color={payment.color} strokeWidth={2.4} />
                <Text style={[styles.paymentText, { color: payment.color }]}>{payment.label}</Text>
              </View>
              <View style={[styles.cardFooter, { borderTopColor: activeColors.border.subtle }]}>
                <View>
                  <Text style={[styles.itemCount, { color: activeColors.text.secondary }]}>{(item.items ?? []).length} ta mahsulot</Text>
                  <Text style={[styles.total, { color: activeColors.brand.primary }]}>{item.total.toLocaleString()} so‘m</Text>
                </View>
                <View style={styles.dateCol}>
                  <Text style={[styles.date, { color: activeColors.text.secondary }]}>
                    {new Date(item.createdAt).toLocaleDateString('uz-UZ')}
                  </Text>
                  <ChevronRight size={18} color={activeColors.text.hint} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: layout.screenPadding,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  trackingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingTitle: { ...typography.bodyStrong },
  trackingSubtitle: { ...typography.caption, marginTop: 1 },
  list: { padding: layout.screenPadding, gap: spacing.md },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { ...typography.bodyStrong },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  statusText: { ...typography.caption, fontSize: 11, fontWeight: '800' },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  shopName: { ...typography.h4, flex: 1 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  paymentText: { ...typography.caption, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  itemCount: { ...typography.caption },
  total: { ...typography.h3, marginTop: 2 },
  dateCol: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  date: { ...typography.caption },
});
