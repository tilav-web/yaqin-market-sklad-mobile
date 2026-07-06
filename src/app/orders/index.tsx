import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Package, Store, WifiOff } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { ORDER_STATUS_KEY, Order } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

export default function OrdersScreen() {
  const { tr } = useTranslation();
  const ordersQuery = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders/mine');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing['4xl'] }} />
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
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            onPress={() => router.push(`/orders/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: colors.status[item.status] }]}>
                <Text style={styles.statusText}>{tr(ORDER_STATUS_KEY[item.status])}</Text>
              </View>
            </View>
            <View style={styles.shopRow}>
              <Store size={14} color={colors.text.tertiary} strokeWidth={2.4} />
              <Text style={styles.shopName} numberOfLines={1}>
                {item.shop?.name ?? '…'}
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.itemCount}>{item.items.length} ta mahsulot</Text>
                <Text style={styles.total}>{item.total.toLocaleString()} so‘m</Text>
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('uz-UZ')}
                </Text>
                <ChevronRight size={18} color={colors.text.hint} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, gap: spacing.md },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { ...typography.bodyStrong, color: colors.text.secondary },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  statusText: { ...typography.caption, fontSize: 11, color: colors.text.onPrimary, fontWeight: '800' },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  shopName: { ...typography.h4, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  itemCount: { ...typography.caption, color: colors.text.secondary },
  total: { ...typography.h3, color: colors.brand.primary, marginTop: 2 },
  dateCol: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  date: { ...typography.caption, color: colors.text.secondary },
});
