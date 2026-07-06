import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Ban, Bike, Check, MapPin, MessageCircle, Navigation, Package, Phone, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { useAlarmState } from '@/stores/alarmState';
import { StaffMember } from '@/constants/staffPermissions';
import { ORDER_STATUS_KEY, Order, OrderStatus } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

function useCourierLocationEmitter(orderId: string | undefined, active: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !orderId) return;

    let cancelled = false;

    const emit = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const socket = await getSocket();
        socket.emit('courier:location', {
          orderId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch {
        // Silently ignore location errors — network/GPS may be unavailable
      }
    };

    void emit();
    intervalRef.current = setInterval(() => { void emit(); }, 10_000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId, active]);
}

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
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const clearIfMatch = useAlarmState((s) => s.clearIfMatch);

  // Stop the continuous alarm as soon as the seller opens this specific order.
  useEffect(() => {
    if (orderId) clearIfMatch(orderId);
  }, [orderId, clearIfMatch]);

  const orderQuery = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${orderId}`);
      return res.data;
    },
  });

  const order = orderQuery.data;
  // Blocking a customer is owner-only server-side.
  const isOwner = useIsShopOwner(order?.shopId);

  useCourierLocationEmitter(orderId, order?.status === 'delivering');

  // Shop staff (to assign a delivering courier).
  const staffQuery = useQuery({
    queryKey: ['staff', order?.shopId],
    enabled: !!order?.shopId,
    queryFn: async () => {
      const res = await api.get<StaffMember[]>(`/seller/shops/${order?.shopId}/staff`);
      return res.data;
    },
  });

  const assign = useMutation({
    mutationFn: async (staffId: string | null) => {
      await api.post(`/seller/shops/${order?.shopId}/orders/${orderId}/assign`, { staffId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-detail', orderId] });
      qc.invalidateQueries({ queryKey: ['seller-orders', order?.shopId] });
      setAssignOpen(false);
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

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
            <Text style={styles.statusText}>{tr(ORDER_STATUS_KEY[order.status])}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>{order.createdAt.slice(0, 16).replace('T', ' ')}</Text>
        <AutoCancelCountdown createdAt={order.createdAt} status={order.status} />

        {order.status === 'delivering' && (
          <View style={styles.locationBadge}>
            <Navigation size={13} color={colors.feedback.success} strokeWidth={2.4} />
            <Text style={styles.locationBadgeText}>Lokatsiya mijozga uzatilmoqda</Text>
          </View>
        )}

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

        {/* Courier assignment (delivery orders) */}
        {order.channel !== 'in_store' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Yetkazuvchi</Text>
            <View style={styles.assignRow}>
              <Bike size={16} color={colors.brand.primary} strokeWidth={2.2} />
              <Text style={styles.assignName}>
                {(() => {
                  const m = (staffQuery.data ?? []).find((s) => s.id === order.assignedStaffId);
                  return m ? `${m.name ?? m.phone} (${m.customRoleName})` : 'Biriktirilmagan';
                })()}
              </Text>
              <Pressable style={styles.assignBtn} onPress={() => setAssignOpen(true)}>
                <Text style={styles.assignBtnText}>{order.assignedStaffId ? 'O‘zgartirish' : 'Biriktirish'}</Text>
              </Pressable>
            </View>
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
        {(cancellable || (order.user && isOwner !== false)) ? (
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
            {order.user && isOwner !== false ? (
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

      {/* Courier picker */}
      <Modal visible={assignOpen} transparent animationType="fade" onRequestClose={() => setAssignOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAssignOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Yetkazuvchini tanlang</Text>
              <Pressable onPress={() => setAssignOpen(false)} hitSlop={8}>
                <X size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            {order.assignedStaffId ? (
              <Pressable style={styles.staffRow} onPress={() => assign.mutate(null)}>
                <Text style={[styles.staffName, { color: colors.text.danger }]}>Biriktirishni bekor qilish</Text>
              </Pressable>
            ) : null}
            {(staffQuery.data ?? []).filter((s) => s.isActive).map((s) => (
              <Pressable key={s.id} style={styles.staffRow} onPress={() => assign.mutate(s.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{s.name ?? s.phone}</Text>
                  <Text style={styles.staffRole}>{s.customRoleName}</Text>
                </View>
                {s.id === order.assignedStaffId ? <Check size={18} color={colors.feedback.success} strokeWidth={2.6} /> : null}
              </Pressable>
            ))}
            {(staffQuery.data ?? []).length === 0 ? (
              <Text style={styles.staffEmpty}>Xodim yo‘q — avval Xodimlar bo‘limida qo‘shing</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assignName: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  assignBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.brand.primaryBorder },
  assignBtnText: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.xs, paddingBottom: spacing['2xl'] },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sheetTitle: { ...typography.h4, color: colors.text.primary },
  staffRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  staffName: { ...typography.bodyStrong, color: colors.text.primary },
  staffRole: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  staffEmpty: { ...typography.bodySmall, color: colors.text.tertiary, paddingVertical: spacing.md, textAlign: 'center' },
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
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: `${colors.feedback.success}18`,
    borderWidth: 1,
    borderColor: colors.feedback.success,
    alignSelf: 'flex-start',
  },
  locationBadgeText: { ...typography.caption, color: colors.feedback.success, fontWeight: '700' },
});
