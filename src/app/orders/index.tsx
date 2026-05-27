import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { Order, OrderStatus, STATUS_LABEL_UZ } from '@/lib/types';

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: '#FBBF24',
  accepted: '#3B82F6',
  preparing: '#8B5CF6',
  delivering: '#0046AD',
  delivered: '#10B981',
  cancelled: '#E1251B',
};

export default function OrdersScreen() {
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
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <ActivityIndicator color={Brand.blue} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>Hozircha buyurtmalar yo&apos;q</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/orders/${item.id}`)}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <View
                style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] }]}>
                <Text style={styles.statusText}>{STATUS_LABEL_UZ[item.status]}</Text>
              </View>
            </View>
            <Text style={styles.shopName}>🏪 {item.shop?.name ?? '...'}</Text>
            <Text style={styles.itemCount}>{item.items.length} ta mahsulot</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.total}>{item.total.toLocaleString()} so&apos;m</Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString('uz-UZ')}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  list: { padding: Spacing.four },
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Brand.gray100,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 14, fontWeight: '700', color: Brand.blue },
  statusBadge: { paddingHorizontal: Spacing.three, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { color: Brand.white, fontSize: 11, fontWeight: '700' },
  shopName: { fontSize: 16, fontWeight: '700', color: Brand.black, marginTop: 4 },
  itemCount: { fontSize: 13, color: Brand.gray600 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
  },
  total: { fontSize: 17, fontWeight: '800', color: Brand.blue },
  date: { fontSize: 12, color: Brand.gray600 },
  emptyState: { padding: Spacing.seven, alignItems: 'center', gap: Spacing.three },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Brand.black },
});
