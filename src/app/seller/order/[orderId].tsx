import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, MapPin, MessageCircle, Package, Phone, RotateCcw } from 'lucide-react-native';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { Order, OrderStatus, STATUS_LABEL_UZ } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  new: { next: 'accepted', label: 'Qabul qilish' },
  accepted: { next: 'preparing', label: 'Yig‘ishni boshlash' },
  preparing: { next: 'delivering', label: 'Yetkazishga uzatish' },
  delivering: { next: 'delivered', label: 'Yetkazib berdim' },
};

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function SellerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const qc = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${orderId}`);
      return res.data;
    },
  });

  const order = orderQuery.data;

  const advance = useMutation({
    mutationFn: async (status: OrderStatus) => {
      await api.patch(`/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-detail', orderId] });
      qc.invalidateQueries({ queryKey: ['seller-orders', order?.shopId] });
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const block = useMutation({
    mutationFn: async () => {
      await api.post(`/seller/shops/${order?.shopId}/block-user`, { userId: order?.user?.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked', order?.shopId] });
      Alert.alert('Bloklandi', 'Bu mijoz endi bu do‘kondan buyurtma bera olmaydi');
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  if (orderQuery.isLoading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const next = NEXT_STATUS[order.status];
  const cancellable = order.status === 'new' || order.status === 'accepted';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status header */}
        <View style={styles.headRow}>
          <Text style={styles.orderNum}>#{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.status[order.status] }]}>
            <Text style={styles.statusText}>{STATUS_LABEL_UZ[order.status]}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{order.createdAt.slice(0, 16).replace('T', ' ')}</Text>

        {/* Customer */}
        {order.user || order.deliveryAddress ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mijoz</Text>
            {order.user?.phone ? (
              <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${order.user?.phone}`)}>
                <Phone size={15} color={colors.brand.primary} strokeWidth={2.2} />
                <Text style={styles.infoLink}>
                  {order.user?.name ?? 'Mijoz'} · {order.user?.phone}
                </Text>
              </Pressable>
            ) : null}
            {order.deliveryAddress?.address ? (
              <View style={styles.infoRow}>
                <MapPin size={15} color={colors.text.secondary} strokeWidth={2.2} />
                <Text style={styles.infoText}>{order.deliveryAddress.address}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Items with images */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mahsulotlar</Text>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={styles.itemImageWrap}>
                {it.productVariant?.photos?.[0] ? (
                  <Image source={{ uri: resolveMedia(it.productVariant.photos[0]) }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemPlaceholder]}>
                    <Package size={18} color={colors.brand.primary} strokeWidth={1.7} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {it.productName}
                </Text>
                <Text style={styles.itemMeta}>
                  {it.quantity} × {fmt(it.unitPrice)} so‘m
                  {it.returnedQuantity > 0 ? ` · ${it.returnedQuantity} qaytdi` : ''}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{fmt(it.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Totals label="Mahsulotlar" value={order.subTotal} />
          {order.deliveryFee > 0 ? <Totals label="Yetkazib berish" value={order.deliveryFee} /> : null}
          <View style={styles.divider} />
          <Totals label="Jami" value={order.total} bold />
        </View>

        {/* Actions */}
        <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${order.id}`)}>
          <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.chatText}>Mijoz bilan chat</Text>
        </Pressable>

        {order.status === 'delivering' ? (
          <Pressable style={styles.returnBtn} onPress={() => router.push(`/seller/return/${order.id}`)}>
            <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
            <Text style={styles.returnText}>Qaytarilgan mahsulotni belgilash</Text>
          </Pressable>
        ) : null}

        {next ? (
          <Pressable
            style={styles.acceptBtn}
            onPress={() => {
              haptics.medium();
              advance.mutate(next.next);
            }}>
            <Text style={styles.acceptText}>{next.label} →</Text>
          </Pressable>
        ) : null}

        {/* Destructive zone — kept far below the primary action */}
        {(cancellable || order.user) ? (
          <View style={styles.dangerZone}>
            {cancellable ? (
              <Pressable
                style={styles.cancelBtn}
                onPress={() =>
                  Alert.alert('Bekor qilish', 'Buyurtmani bekor qilasizmi?', [
                    { text: 'Yo‘q', style: 'cancel' },
                    { text: 'Ha', style: 'destructive', onPress: () => advance.mutate('cancelled') },
                  ])
                }>
                <Text style={styles.cancelText}>Buyurtmani bekor qilish</Text>
              </Pressable>
            ) : null}
            {order.user ? (
              <Pressable
                style={styles.blockBtn}
                onPress={() =>
                  Alert.alert(
                    'Mijozni bloklash',
                    `${order.user?.name ?? order.user?.phone} bu do‘kondan buyurtma bera olmaydi. Davom etilsinmi?`,
                    [
                      { text: 'Yo‘q', style: 'cancel' },
                      { text: 'Bloklash', style: 'destructive', onPress: () => block.mutate() },
                    ],
                  )
                }>
                <Ban size={15} color={colors.text.danger} strokeWidth={2.3} />
                <Text style={styles.blockText}>Mijozni bu do‘kon uchun bloklash</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Totals({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.totalsRow}>
      <Text style={[styles.totalsLabel, bold && styles.totalsBold]}>{label}</Text>
      <Text style={[styles.totalsValue, bold && styles.totalsBold]}>{fmt(value)} so‘m</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNum: { ...typography.h3, color: colors.text.primary },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.full },
  statusText: { ...typography.caption, fontSize: 12, color: colors.text.onPrimary, fontWeight: '800' },
  dateText: { ...typography.caption, color: colors.text.tertiary, marginTop: -spacing.xs },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.overline, color: colors.text.secondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLink: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary, flex: 1 },
  infoText: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemImageWrap: { width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden' },
  itemImage: { width: 48, height: 48, backgroundColor: colors.brand.primarySurface },
  itemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemName: { ...typography.bodySmall, fontWeight: '600', color: colors.text.primary },
  itemMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  itemTotal: { ...typography.bodySmall, fontWeight: '800', color: colors.text.primary },
  divider: { height: 1, backgroundColor: colors.border.subtle },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalsLabel: { ...typography.bodySmall, color: colors.text.secondary },
  totalsValue: { ...typography.bodySmall, color: colors.text.primary },
  totalsBold: { ...typography.bodyStrong, color: colors.brand.primary },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: layout.buttonHeight.md,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  chatText: { ...typography.body, fontWeight: '700', color: colors.brand.primary },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: layout.buttonHeight.sm,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.warningSurface,
  },
  returnText: { ...typography.bodySmall, fontWeight: '700', color: colors.feedback.warning },
  acceptBtn: {
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.feedback.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
  // Far from the primary action, visually separated.
  dangerZone: {
    marginTop: spacing['2xl'],
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: spacing.sm,
  },
  cancelBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.feedback.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { ...typography.bodySmall, fontWeight: '700', color: colors.feedback.danger },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  blockText: { ...typography.bodySmall, fontWeight: '600', color: colors.text.danger },
});
