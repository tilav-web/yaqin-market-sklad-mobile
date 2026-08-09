import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, Bike, Check, MapPin, MessageCircle, Navigation, Package, Phone, RotateCcw, ScanBarcode, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { useAdvanceOrderStatus } from '@/hooks/use-advance-order-status';
import { isTrackingOrder, startCourierTracking, stopCourierTracking } from '@/lib/courier-location-task';
import { tr, useTranslation, type TranslationKey } from '@/i18n';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { useAlarmState } from '@/stores/alarmState';
import { StaffMember } from '@/constants/staffPermissions';
import { ORDER_STATUS_KEY, Order, OrderItem, OrderStatus } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/**
 * Mirrors (resumes) live location reporting to match the order's status —
 * the actual START happens once, in useAdvanceOrderStatus, at the moment
 * the seller taps "Kuryerga berish" (from EITHER this screen or the orders
 * list). This hook no longer starts tracking or shows the disclosure Alert
 * on its own — it only checks whether tracking is currently active and, if
 * the order is `delivering` but tracking somehow isn't running (background
 * task killed, permission revoked mid-delivery, or advanced from a build
 * that predates this), exposes `enable()` for a banner to offer resuming it
 * instead of silently doing nothing.
 */
function useCourierTracking(orderId: string | undefined, status: OrderStatus | undefined) {
  const [isTracking, setIsTracking] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!orderId || !status) return;
    let cancelled = false;

    if (status !== 'delivering') {
      void stopCourierTracking(orderId).then(() => {
        if (cancelled) return;
        setIsTracking(false);
        setChecked(true);
      });
      return () => {
        cancelled = true;
      };
    }

    void isTrackingOrder(orderId).then((already) => {
      if (cancelled) return;
      setIsTracking(already);
      setChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [orderId, status]);

  const enable = () => {
    if (!orderId) return;
    Alert.alert(
      tr('sellerOrder.locationShareTitle'),
      tr('sellerOrder.locationShareBody'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('sellerOrder.agree'),
          onPress: () => {
            void startCourierTracking(orderId).then((result) => {
              if (result.ok) {
                setIsTracking(true);
              } else {
                Alert.alert(tr('sellerOrder.locationPermTitle'), tr('sellerOrder.locationPermBody'));
              }
            });
          },
        },
      ],
    );
  };

  return { isTracking, needsEnable: checked && status === 'delivering' && !isTracking, enable };
}

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: TranslationKey }>> = {
  new: { next: 'accepted', label: 'sellerOrder.actionAccept' },
  accepted: { next: 'preparing', label: 'sellerOrder.actionStartPicking' },
  preparing: { next: 'delivering', label: 'sellerOrder.actionHandToCourier' },
  delivering: { next: 'delivered', label: 'sellerOrder.actionDelivered' },
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

  // ── Markirovka (Asl belgisi) skanerlash ──
  // Har bir dona uchun bitta Data Matrix kod; kodlar chekka kiradi (qonun
  // talabi). Skaner ochiq qoladi — sotilgan donalar soni yig'ilguncha.
  const [markingItem, setMarkingItem] = useState<OrderItem | null>(null);
  // The ref stays the accumulator: scans can land back-to-back and each one
  // must see the previous code, which a state read in the same tick would
  // miss. `markingCount` mirrors its length purely so the scanner title
  // re-renders — reading the ref during render never repainted the counter.
  const markingCodesRef = useRef<string[]>([]);
  const [markingCount, setMarkingCount] = useState(0);
  const saveMarking = useMutation({
    mutationFn: (payload: { orderItemId: string; codes: string[] }) =>
      api.put(`/orders/${orderId}/marking-codes`, { items: [payload] }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['order-detail', orderId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const openMarkingScanner = (it: OrderItem) => {
    markingCodesRef.current = [...(it.markingCodes ?? [])];
    setMarkingCount(markingCodesRef.current.length);
    setMarkingItem(it);
  };

  const handleMarkingScan = (code: string) => {
    const item = markingItem;
    if (!item) return;
    if (markingCodesRef.current.includes(code)) {
      haptics.warning();
      return;
    }
    haptics.success();
    markingCodesRef.current = [...markingCodesRef.current, code];
    setMarkingCount(markingCodesRef.current.length);
    saveMarking.mutate({ orderItemId: item.id, codes: markingCodesRef.current });
    const needed = item.quantity - item.returnedQuantity;
    if (markingCodesRef.current.length >= needed) setMarkingItem(null);
  };

  const { isTracking, needsEnable, enable: enableTracking } = useCourierTracking(orderId, order?.status);

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
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  // QR handshake — only ever shown when order.requiresHandshake is true
  // (an admin-confirmed risk flag on the assigned courier). Verification is
  // best-effort and never blocks the delivery; see RiskHandshakeService.
  const [handshakeScanOpen, setHandshakeScanOpen] = useState(false);
  const verifyHandshake = useMutation({
    mutationFn: async (token: string) => {
      await api.post(`/orders/${orderId}/handshake/verify`, { token });
    },
  });

  const advance = useAdvanceOrderStatus({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-detail', orderId] });
      qc.invalidateQueries({ queryKey: ['seller-orders', order?.shopId] });
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const proceedToDelivered = () => {
    if (!order) return;
    haptics.medium();
    advance.mutate({ orderId: order.id, status: 'delivered', deliveryAddress: order.deliveryAddress });
  };

  const handleHandshakeScanned = (raw: string) => {
    const token = /token=([a-zA-Z0-9]+)/.exec(raw)?.[1];
    if (token) verifyHandshake.mutate(token);
    proceedToDelivered();
  };

  const block = useMutation({
    mutationFn: async () => {
      await api.post(`/seller/shops/${order?.shopId}/block-user`, { userId: order?.user?.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked', order?.shopId] });
      Alert.alert(tr('sellerOrder.blockedTitle'), tr('sellerOrder.blockedBody'));
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
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

        {isTracking && (
          <View style={styles.locationBadge}>
            <Navigation size={13} color={colors.feedback.success} strokeWidth={2.4} />
            <Text style={styles.locationBadgeText}>{tr('sellerOrder.locationSharing')}</Text>
          </View>
        )}
        {needsEnable && (
          <Pressable style={styles.trackingOffBanner} onPress={enableTracking}>
            <Navigation size={13} color={colors.feedback.warning} strokeWidth={2.4} />
            <Text style={styles.trackingOffText}>{tr('risk.trackingOffBanner')}</Text>
            <Text style={styles.trackingOffAction}>{tr('risk.trackingEnable')}</Text>
          </Pressable>
        )}

        {/* Customer */}
        {order.user || order.deliveryAddress ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{tr('sellerOrder.customer')}</Text>
            {order.user?.phone ? (
              <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${order.user?.phone}`)}>
                <Phone size={15} color={colors.brand.primary} strokeWidth={2.2} />
                <Text style={styles.infoLink}>
                  {order.user?.name ?? tr('sellerOrder.customer')} · {order.user?.phone}
                </Text>
              </Pressable>
            ) : null}
            {order.deliveryAddress?.address ? (
              <View style={styles.infoRow}>
                <MapPin size={15} color={colors.text.secondary} strokeWidth={2.2} />
                <Text style={styles.infoText}>{order.deliveryAddress.address}</Text>
              </View>
            ) : null}
            {order.deliveryAddress &&
            (order.deliveryAddress.entrance || order.deliveryAddress.floor || order.deliveryAddress.apartment || order.deliveryAddress.intercom) ? (
              <Text style={styles.infoText}>
                {[
                  order.deliveryAddress.entrance &&
                    tr('sellerOrder.entrance', { n: order.deliveryAddress.entrance }),
                  order.deliveryAddress.floor &&
                    tr('sellerOrder.floor', { n: order.deliveryAddress.floor }),
                  order.deliveryAddress.apartment &&
                    tr('sellerOrder.apartment', { n: order.deliveryAddress.apartment }),
                  order.deliveryAddress.intercom &&
                    tr('sellerOrder.intercom', { n: order.deliveryAddress.intercom }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
            {order.recipientPhone && order.recipientPhone !== order.user?.phone ? (
              <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${order.recipientPhone}`)}>
                <Phone size={15} color={colors.brand.primary} strokeWidth={2.2} />
                <Text style={styles.infoLink}>
                  {tr('sellerOrder.recipient', { phone: order.recipientPhone })}
                </Text>
              </Pressable>
            ) : null}
            {order.courierComment ? (
              <Text style={styles.infoText}>
                {tr('sellerOrder.courierComment', { text: order.courierComment })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Courier assignment (delivery orders) */}
        {order.channel !== 'in_store' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{tr('sellerOrder.courier')}</Text>
            <View style={styles.assignRow}>
              <Bike size={16} color={colors.brand.primary} strokeWidth={2.2} />
              <Text style={styles.assignName}>
                {(() => {
                  const m = (staffQuery.data ?? []).find((s) => s.id === order.assignedStaffId);
                  return m ? `${m.name ?? m.phone} (${m.customRoleName})` : tr('sellerOrder.unassigned');
                })()}
              </Text>
              <Pressable style={styles.assignBtn} onPress={() => setAssignOpen(true)}>
                <Text style={styles.assignBtnText}>
                  {order.assignedStaffId ? tr('common.edit') : tr('sellerOrder.assign')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Items with images */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr('shop.products')}</Text>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={styles.itemImageWrap}>
                {it.productVariant?.globalProduct?.photos?.[0] ? (
                  <Image
                    source={{ uri: resolveMedia(it.productVariant.globalProduct.photos[0]) }}
                    style={styles.itemImage}
                  />
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
                  {it.quantity} × {fmt(it.unitPrice)} {tr('common.som')}
                  {it.returnedQuantity > 0
                    ? ` · ${tr('sellerOrder.returnedCount', { n: it.returnedQuantity })}`
                    : ''}
                </Text>
                {it.productVariant?.globalProduct?.taxCategory?.markingRequired ? (
                  <Pressable
                    style={styles.markingRow}
                    onPress={() => openMarkingScanner(it)}
                    disabled={saveMarking.isPending}
                  >
                    <ScanBarcode
                      size={14}
                      color={
                        (it.markingCodes?.length ?? 0) >= it.quantity - it.returnedQuantity
                          ? colors.feedback.success
                          : colors.feedback.warning
                      }
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        styles.markingText,
                        (it.markingCodes?.length ?? 0) >= it.quantity - it.returnedQuantity
                          ? styles.markingDone
                          : styles.markingPending,
                      ]}
                    >
                      {tr('sellerOrder.marking', {
                        done: it.markingCodes?.length ?? 0,
                        total: it.quantity - it.returnedQuantity,
                      })}
                      {(it.markingCodes?.length ?? 0) < it.quantity - it.returnedQuantity
                        ? ` — ${tr('sellerOrder.scanAction')}`
                        : ''}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.itemTotal}>{fmt(it.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Totals label={tr('cart.subtotal')} value={order.subTotal} />
          {order.deliveryFee > 0 ? (
            <Totals label={tr('cart.deliveryFee')} value={order.deliveryFee} />
          ) : null}
          <View style={styles.divider} />
          <Totals label={tr('cart.total')} value={order.total} bold />
        </View>

        {/* Actions */}
        <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${order.id}`)}>
          <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.chatText}>{tr('sellerOrder.chatWithCustomer')}</Text>
        </Pressable>

        {order.status === 'delivering' ? (
          <Pressable style={styles.returnBtn} onPress={() => router.push(`/seller/return/${order.id}`)}>
            <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
            <Text style={styles.returnText}>{tr('sellerOrder.markReturn')}</Text>
          </Pressable>
        ) : null}

        {next ? (
          <Pressable
            style={styles.acceptBtn}
            onPress={() => {
              if (next.next === 'delivered' && order.requiresHandshake) {
                setHandshakeScanOpen(true);
                return;
              }
              haptics.medium();
              advance.mutate({ orderId: order.id, status: next.next, deliveryAddress: order.deliveryAddress });
            }}>
            <Text style={styles.acceptText}>{tr(next.label)} →</Text>
          </Pressable>
        ) : null}

        {/* Destructive zone — kept far below the primary action */}
        {(cancellable || (order.user && isOwner !== false)) ? (
          <View style={styles.dangerZone}>
            {cancellable ? (
              // A `new` order hasn't been accepted yet — declining it is a
              // distinct outcome (seller_rejected) from cancelling an already
              // accepted order: it triggers the customer's "try another
              // store" suggestion flow instead of a plain dead end.
              order.status === 'new' ? (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() =>
                    Alert.alert(tr('sellerOrder.rejectTitle'), tr('sellerOrder.rejectConfirm'), [
                      { text: tr('common.no'), style: 'cancel' },
                      { text: tr('common.yes'), style: 'destructive', onPress: () => advance.mutate({ orderId: order.id, status: 'seller_rejected' }) },
                    ])
                  }>
                  <Text style={styles.cancelText}>{tr('sellerOrder.rejectTitle')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() =>
                    Alert.alert(tr('orders.cancel'), tr('orders.cancelConfirm'), [
                      { text: tr('common.no'), style: 'cancel' },
                      { text: tr('common.yes'), style: 'destructive', onPress: () => advance.mutate({ orderId: order.id, status: 'cancelled' }) },
                    ])
                  }>
                  <Text style={styles.cancelText}>{tr('sellerOrder.cancelOrder')}</Text>
                </Pressable>
              )
            ) : null}
            {order.user && isOwner !== false ? (
              <Pressable
                style={styles.blockBtn}
                onPress={() =>
                  Alert.alert(
                    tr('sellerOrder.blockTitle'),
                    tr('sellerOrder.blockConfirm', {
                      name: order.user?.name ?? order.user?.phone ?? '',
                    }),
                    [
                      { text: tr('common.no'), style: 'cancel' },
                      {
                        text: tr('sellerOrder.blockAction'),
                        style: 'destructive',
                        onPress: () => block.mutate(),
                      },
                    ],
                  )
                }>
                <Ban size={15} color={colors.text.danger} strokeWidth={2.3} />
                <Text style={styles.blockText}>{tr('sellerOrder.blockCustomer')}</Text>
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
              <Text style={styles.sheetTitle}>{tr('sellerOrder.pickCourier')}</Text>
              <Pressable onPress={() => setAssignOpen(false)} hitSlop={8}>
                <X size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            {order.assignedStaffId ? (
              <Pressable style={styles.staffRow} onPress={() => assign.mutate(null)}>
                <Text style={[styles.staffName, { color: colors.text.danger }]}>
                  {tr('sellerOrder.unassign')}
                </Text>
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
              <Text style={styles.staffEmpty}>{tr('sellerOrder.noStaff')}</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Markirovka (Data Matrix) skaneri — dona-dona ketma-ket skanerlanadi. */}
      <BarcodeScannerModal
        visible={!!markingItem}
        onClose={() => setMarkingItem(null)}
        onScanned={handleMarkingScan}
        closeOnScan={false}
        barcodeTypes={['datamatrix']}
        title={
          markingItem
            ? tr('sellerOrder.markingScanFor', {
                name: markingItem.productName,
                done: markingCount,
                total: markingItem.quantity - markingItem.returnedQuantity,
              })
            : tr('sellerOrder.markingScan')
        }
      />

      {/* QR handshake — only rendered when order.requiresHandshake is true. */}
      <BarcodeScannerModal
        visible={handshakeScanOpen}
        onClose={() => setHandshakeScanOpen(false)}
        onScanned={handleHandshakeScanned}
        onSkip={proceedToDelivered}
        skipLabel={tr('sellerOrder.handshakeSkip')}
        barcodeTypes={['qr']}
        title={tr('sellerOrder.handshakeScan')}
      />
    </SafeAreaView>
  );
}

function Totals({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.totalsRow}>
      <Text style={[styles.totalsLabel, bold && styles.totalsBold]}>{label}</Text>
      <Text style={[styles.totalsValue, bold && styles.totalsBold]}>
        {fmt(value)} {tr('common.som')}
      </Text>
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
  markingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  markingText: { ...typography.caption, fontWeight: '700' },
  markingDone: { color: colors.feedback.success },
  markingPending: { color: colors.feedback.warning },
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
  trackingOffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.warningSurface,
    borderWidth: 1,
    borderColor: colors.feedback.warning,
    alignSelf: 'flex-start',
  },
  trackingOffText: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700' },
  trackingOffAction: {
    ...typography.caption,
    color: colors.feedback.warning,
    fontWeight: '800',
    textDecorationLine: 'underline',
    marginLeft: 2,
  },
});
