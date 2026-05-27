import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, OrderStatus, STATUS_LABEL_UZ } from '@/lib/types';

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: '#FBBF24',
  accepted: '#3B82F6',
  preparing: '#8B5CF6',
  delivering: '#0046AD',
  delivered: '#10B981',
  cancelled: '#E1251B',
};

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  new: { next: 'accepted', label: 'Qabul qilish' },
  accepted: { next: 'preparing', label: 'Yig\'ishni boshlash' },
  preparing: { next: 'delivering', label: 'Yetkazib berishga uzatish' },
  delivering: { next: 'delivered', label: 'Yetkazib berdim' },
};

export default function SellerOrdersScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['seller-orders', shopId],
    queryFn: async () => {
      const res = await api.get<Order[]>(`/seller/shops/${shopId}/orders`);
      return res.data;
    },
    refetchInterval: 10_000,
  });

  const advance = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await api.patch<Order>(`/orders/${orderId}/status`, { status });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders', shopId] }),
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.patch<Order>(`/orders/${orderId}/status`, {
        status: 'cancelled',
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders', shopId] }),
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <ActivityIndicator color={Brand.red} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Buyurtmalar yo&apos;q</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const next = NEXT_STATUS[item.status];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNum}>#{item.orderNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABEL_UZ[item.status]}</Text>
                </View>
              </View>
              <View style={styles.itemsBlock}>
                {item.items.slice(0, 5).map((it) => (
                  <Text key={it.id} style={styles.itemText}>
                    • {it.quantity} × {it.productName}
                  </Text>
                ))}
              </View>
              <Text style={styles.total}>{item.total.toLocaleString()} so&apos;m</Text>
              {next && (
                <Pressable
                  style={styles.actionBtn}
                  onPress={() =>
                    advance.mutate({ orderId: item.id, status: next.next })
                  }>
                  <Text style={styles.actionBtnText}>{next.label} →</Text>
                </Pressable>
              )}
              {(item.status === 'new' || item.status === 'accepted') && (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() =>
                    Alert.alert('Bekor qilish', 'Buyurtmani bekor qilasizmi?', [
                      { text: 'Yo\'q', style: 'cancel' },
                      {
                        text: 'Ha',
                        style: 'destructive',
                        onPress: () => cancel.mutate(item.id),
                      },
                    ])
                  }>
                  <Text style={styles.cancelBtnText}>Bekor qilish</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
      <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.backBtnText}>← Customer rejimga qaytish</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  list: { padding: Spacing.four, paddingBottom: 100 },
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.two,
    borderLeftWidth: 4,
    borderLeftColor: Brand.red,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { fontSize: 14, fontWeight: '700', color: Brand.blue },
  statusBadge: { paddingHorizontal: Spacing.three, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { color: Brand.white, fontSize: 11, fontWeight: '700' },
  itemsBlock: { marginTop: Spacing.two, gap: 2 },
  itemText: { fontSize: 14, color: Brand.gray800 },
  total: { fontSize: 18, fontWeight: '800', color: Brand.blue, marginTop: Spacing.two },
  actionBtn: { backgroundColor: Brand.blue, padding: 12, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.two },
  actionBtnText: { color: Brand.white, fontWeight: '700' },
  cancelBtn: { padding: 10, alignItems: 'center', marginTop: 6 },
  cancelBtnText: { color: Brand.red, fontWeight: '600' },
  emptyState: { padding: Spacing.seven, alignItems: 'center', gap: Spacing.three },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Brand.black },
  backBtn: { position: 'absolute', bottom: Spacing.four, left: Spacing.four, right: Spacing.four, backgroundColor: Brand.blue, padding: 14, borderRadius: Radius.lg, alignItems: 'center' },
  backBtnText: { color: Brand.white, fontWeight: '700' },
});
