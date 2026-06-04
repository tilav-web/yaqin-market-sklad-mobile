import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronRight, ChevronUp, MessageCircle, Package, RotateCcw, ScanLine, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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

type Filter = 'new' | 'progress' | 'done';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'new', label: 'Yangi' },
  { key: 'progress', label: 'Jarayonda' },
  { key: 'done', label: 'Yakunlangan' },
];

// "Jarayonda" = accepted/preparing/delivering. "Yangi" = only awaiting accept.
// "Yakunlangan" = fully closed (delivered or cancelled).
const PROGRESS: OrderStatus[] = ['accepted', 'preparing', 'delivering'];
const DONE: OrderStatus[] = ['delivered', 'cancelled'];

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function SellerOrdersScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('new');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ordersQuery = useQuery({
    queryKey: ['seller-orders', shopId],
    queryFn: async () => {
      const res = await api.get<Order[]>(`/seller/shops/${shopId}/orders`);
      return res.data;
    },
    refetchInterval: 20_000,
  });

  // Opening this tab marks the shop's orders as seen → clears the profile badge.
  useFocusEffect(
    useCallback(() => {
      api
        .post(`/seller/shops/${shopId}/orders/seen`)
        .then(() => qc.invalidateQueries({ queryKey: ['shops', 'mine'] }))
        .catch(() => {});
    }, [shopId, qc]),
  );

  const onNewOrder = useCallback(() => {
    haptics.success();
    toast.show('Yangi buyurtma keldi!', { variant: 'success' });
    qc.invalidateQueries({ queryKey: ['seller-orders', shopId] });
  }, [toast, qc, shopId]);
  useShopRealtime(shopId, onNewOrder);

  const advance = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      await api.patch(`/orders/${orderId}/status`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-orders', shopId] }),
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const all = ordersQuery.data ?? [];
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filters */}
      <View style={styles.segments}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.segment, filter === f.key && styles.segmentActive]}>
            <Text style={[styles.segmentText, filter === f.key && styles.segmentTextActive]}>
              {f.label}
              {counts[f.key] > 0 ? ` · ${counts[f.key]}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

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
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing['4xl'] }} />
          ) : (
            <EmptyState icon={Package} title="Buyurtma yo‘q" description="Bu bo‘limda buyurtmalar yo‘q" />
          )
        }
        renderItem={({ item }) => {
          const next = NEXT_STATUS[item.status];
          const isOpen = expanded[item.id];
          const itemCount = item.items.reduce((s, it) => s + it.quantity, 0);
          return (
            <View style={[styles.card, { borderLeftColor: colors.status[item.status] }]}>
              {/* Header: tap order number → detail. Cancel sits up here, far from Accept. */}
              <View style={styles.cardHeader}>
                <Pressable style={styles.numWrap} onPress={() => router.push(`/seller/order/${item.id}`)} hitSlop={6}>
                  <Text style={styles.orderNum}>#{item.orderNumber}</Text>
                  <ChevronRight size={15} color={colors.text.tertiary} strokeWidth={2.4} />
                </Pressable>
                <View style={styles.headerRight}>
                  <View style={[styles.statusBadge, { backgroundColor: colors.status[item.status] }]}>
                    <Text style={styles.statusText}>{STATUS_LABEL_UZ[item.status]}</Text>
                  </View>
                  {(item.status === 'new' || item.status === 'accepted') && (
                    <Pressable
                      style={styles.cancelIcon}
                      hitSlop={8}
                      onPress={() =>
                        Alert.alert('Bekor qilish', `#${item.orderNumber} bekor qilinsinmi?`, [
                          { text: 'Yo‘q', style: 'cancel' },
                          { text: 'Ha', style: 'destructive', onPress: () => advance.mutate({ orderId: item.id, status: 'cancelled' }) },
                        ])
                      }>
                      <X size={16} color={colors.feedback.danger} strokeWidth={2.8} />
                    </Pressable>
                  )}
                </View>
              </View>
              <Text style={styles.time}>{item.createdAt.slice(11, 16)} · {itemCount} dona</Text>

              {/* Accordion: tap to expand items with images */}
              <Pressable
                style={styles.accordionToggle}
                onPress={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}>
                <Text style={styles.accordionLabel}>
                  {isOpen ? 'Mahsulotlarni yashirish' : `${item.items.length} xil mahsulot`}
                </Text>
                {isOpen ? (
                  <ChevronUp size={16} color={colors.brand.primary} strokeWidth={2.4} />
                ) : (
                  <ChevronDown size={16} color={colors.brand.primary} strokeWidth={2.4} />
                )}
              </Pressable>

              {isOpen ? (
                <View style={styles.itemsExpanded}>
                  {item.items.map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                      <View style={styles.itemImageWrap}>
                        {it.productVariant?.photos?.[0] ? (
                          <Image source={{ uri: it.productVariant.photos[0] }} style={styles.itemImage} />
                        ) : (
                          <View style={[styles.itemImage, styles.itemPlaceholder]}>
                            <Package size={16} color={colors.brand.primary} strokeWidth={1.7} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {it.productName}
                      </Text>
                      <Text style={styles.itemQty}>×{it.quantity}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.preview} numberOfLines={1}>
                  {item.items.map((it) => it.productName).join(', ')}
                </Text>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.total}>{fmt(item.total)} so‘m</Text>
                <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${item.id}`)}>
                  <MessageCircle size={16} color={colors.brand.primary} strokeWidth={2.4} />
                  <Text style={styles.chatBtnText}>Chat</Text>
                </Pressable>
              </View>

              {item.status === 'delivering' && (
                <Pressable style={styles.returnBtn} onPress={() => router.push(`/seller/return/${item.id}`)}>
                  <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
                  <Text style={styles.returnBtnText}>Qaytarilgan mahsulotni belgilash</Text>
                </Pressable>
              )}

              {/* Primary advance/accept — big, at the bottom (far from Cancel up top) */}
              {next && (
                <Pressable
                  style={[styles.actionBtn, item.status === 'new' && styles.acceptBtn]}
                  onPress={() => {
                    haptics.medium();
                    advance.mutate({ orderId: item.id, status: next.next });
                  }}>
                  {item.status === 'new' ? <Check size={18} color={colors.text.onPrimary} strokeWidth={2.8} /> : null}
                  <Text style={styles.actionBtnText}>{next.label}</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {/* In-store sale (POS) — bottom-right, like the inventory add button */}
      <Pressable style={styles.fab} onPress={() => router.push(`/seller/pos/${shopId}`)}>
        <ScanLine size={20} color={colors.text.onPrimary} strokeWidth={2.5} />
        <Text style={styles.fabText}>Sotish</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  segmentText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  segmentTextActive: { color: colors.text.onPrimary },
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
  numWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  orderNum: { ...typography.bodyStrong, color: colors.text.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  statusText: { ...typography.caption, fontSize: 11, color: colors.text.onPrimary, fontWeight: '800' },
  cancelIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { ...typography.caption, color: colors.text.tertiary },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  accordionLabel: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
  preview: { ...typography.caption, color: colors.text.secondary },
  itemsExpanded: { gap: spacing.sm, marginTop: spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemImageWrap: { width: 40, height: 40, borderRadius: radius.sm, overflow: 'hidden' },
  itemImage: { width: 40, height: 40, backgroundColor: colors.brand.primarySurface },
  itemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemName: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  itemQty: { ...typography.bodySmall, fontWeight: '800', color: colors.text.primary },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  total: { ...typography.h4, color: colors.brand.primary },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  chatBtnText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: layout.buttonHeight.sm,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.warningSurface,
    marginTop: spacing.sm,
  },
  returnBtnText: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  acceptBtn: { backgroundColor: colors.feedback.success },
  actionBtnText: { ...typography.buttonSmall, color: colors.text.onPrimary },
});
