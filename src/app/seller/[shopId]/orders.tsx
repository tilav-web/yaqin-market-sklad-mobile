import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageCircle, Package } from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, useToast } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, OrderStatus, STATUS_LABEL_UZ } from '@/lib/types';
import { useShopRealtime } from '@/lib/useShopRealtime';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  new: { next: 'accepted', label: 'Qabul qilish' },
  accepted: { next: 'preparing', label: 'Yig‘ishni boshlash' },
  preparing: { next: 'delivering', label: 'Yetkazishga uzatish' },
  delivering: { next: 'delivered', label: 'Yetkazib berdim' },
};

export default function SellerOrdersScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const toast = useToast();

  const ordersQuery = useQuery({
    queryKey: ['seller-orders', shopId],
    queryFn: async () => {
      const res = await api.get<Order[]>(`/seller/shops/${shopId}/orders`);
      return res.data;
    },
    refetchInterval: 20_000,
  });

  const onNewOrder = useCallback(() => {
    haptics.success();
    toast.show('Yangi buyurtma keldi!', { variant: 'success' });
  }, [toast]);
  useShopRealtime(shopId, onNewOrder);

  const advance = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await api.patch<Order>(`/orders/${orderId}/status`, { status });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders', shopId] }),
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.patch<Order>(`/orders/${orderId}/status`, { status: 'cancelled' });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders', shopId] }),
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={ordersQuery.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing['4xl'] }} />
          ) : (
            <EmptyState icon={Package} title="Buyurtmalar yo‘q" description="Yangi buyurtmalar shu yerda ko‘rinadi" />
          )
        }
        renderItem={({ item }) => {
          const next = NEXT_STATUS[item.status];
          const cancellable = item.status === 'new' || item.status === 'accepted';
          return (
            <View style={[styles.card, { borderLeftColor: colors.status[item.status] }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNum}>#{item.orderNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: colors.status[item.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABEL_UZ[item.status]}</Text>
                </View>
              </View>
              <View style={styles.itemsBlock}>
                {item.items.slice(0, 6).map((it) => (
                  <Text key={it.id} style={styles.itemText}>
                    • {it.quantity} × {it.productName}
                  </Text>
                ))}
              </View>
              <Text style={styles.total}>{item.total.toLocaleString()} so‘m</Text>
              <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${item.id}`)}>
                <MessageCircle size={16} color={colors.brand.primary} strokeWidth={2.4} />
                <Text style={styles.chatBtnText}>Mijoz bilan chat</Text>
              </Pressable>
              {next && (
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => {
                    haptics.medium();
                    advance.mutate({ orderId: item.id, status: next.next });
                  }}>
                  <Text style={styles.actionBtnText}>{next.label} →</Text>
                </Pressable>
              )}
              {cancellable && (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() =>
                    Alert.alert('Bekor qilish', 'Buyurtmani bekor qilasizmi?', [
                      { text: 'Yo‘q', style: 'cancel' },
                      { text: 'Ha', style: 'destructive', onPress: () => cancel.mutate(item.id) },
                    ])
                  }>
                  <Text style={styles.cancelBtnText}>Bekor qilish</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
          <ArrowLeft size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
          <Text style={styles.backBtnText}>Customer rejimga qaytish</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, paddingBottom: 96, gap: spacing.md },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { ...typography.bodyStrong, color: colors.text.secondary },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  statusText: { ...typography.caption, fontSize: 11, color: colors.text.onPrimary, fontWeight: '800' },
  itemsBlock: { marginTop: spacing.xs, gap: 2 },
  itemText: { ...typography.bodySmall, color: colors.text.primary },
  total: { ...typography.h3, color: colors.brand.primary, marginTop: spacing.xs },
  actionBtn: {
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  actionBtnText: { ...typography.buttonSmall, color: colors.text.onPrimary },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: layout.buttonHeight.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
    marginTop: spacing.sm,
  },
  chatBtnText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  cancelBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  cancelBtnText: { ...typography.buttonSmall, color: colors.feedback.danger },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.text.primary,
    ...shadow.sm,
  },
  backBtnText: { ...typography.buttonSmall, color: colors.text.onPrimary },
});
