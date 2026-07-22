import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronRight, ChevronUp, MapPin, MessageCircle, Navigation, Package, Phone, RotateCcw, ScanLine, Truck, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { EmptyState, useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { DeliveryRoute, DeliveryRouteStop, ORDER_STATUS_KEY, Order, OrderStatus } from '@/lib/types';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { useShopRealtime } from '@/lib/useShopRealtime';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/** `https://maps.google.com/?daddr=...` per SPEC.md §27.3 — no installed-app
 * detection or Yandex fallback, matching the spec's "this is fine" note. */
function openDirections(lat: number, lng: number) {
  Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}&dirflg=d`).catch(() => {});
}

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  new: { next: 'accepted', label: 'Qabul qilish' },
  accepted: { next: 'preparing', label: "Yig'ishni boshlash" },
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
const DONE: OrderStatus[] = ['delivered', 'cancelled', 'seller_no_response', 'seller_rejected'];

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function SellerOrdersScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('new');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [routeOpen, setRouteOpen] = useState(false);
  const routeMapRef = useRef<MapView | null>(null);
  // SPEC.md §27.4 — owners always pass; staff need `orders.view_assigned`.
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

  // Opening this tab marks the shop's orders as seen → clears the profile badge.
  // Cache is updated optimistically (no refetch) to avoid a tab-switch freeze.
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
  // SPEC.md §27.2 — the button only appears once there are ≥2 orders actually
  // out for delivery (below that, there's nothing to "optimize").
  const canSeeRoute = deliveringCount >= 2 && access.has('orders.view_assigned');

  // Fit the map to the shop + all stops once the route loads.
  useEffect(() => {
    if (!routeOpen || !routeQuery.data?.stops.length) return;
    const coords = [
      { latitude: routeQuery.data.shopLocation.lat, longitude: routeQuery.data.shopLocation.lng },
      ...routeQuery.data.stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
    ];
    const id = setTimeout(() => {
      routeMapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }, 350);
    return () => clearTimeout(id);
  }, [routeOpen, routeQuery.data]);

  const EMPTY_MSG: Record<Filter, { title: string; desc: string }> = {
    new: { title: "Yangi buyurtma yo'q", desc: "Mijozlar buyurtma berganda shu yerda ko'rinadi" },
    progress: { title: "Jarayondagi buyurtma yo'q", desc: "Qabul qilingan buyurtmalar shu yerda ko'rinadi" },
    done: { title: "Yakunlangan buyurtma yo'q", desc: "Yetkazilgan va bekor buyurtmalar shu yerda ko'rinadi" },
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ── Filters + route ── */}
      <View style={styles.segments}>
        {FILTERS.map((f) => {
          const cnt = counts[f.key];
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.segment, isActive && styles.segmentActive]}>
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {f.label}
              </Text>
              {cnt > 0 && (
                <View style={[styles.badge, isActive ? styles.badgeActive : f.key === 'new' ? styles.badgeNew : styles.badgeMuted]}>
                  <Text style={[styles.badgeText, isActive || f.key === 'new' ? styles.badgeTextLight : styles.badgeTextDark]}>
                    {cnt}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
        {/* Route button — only when ≥2 orders are out for delivery (SPEC.md §27.2) */}
        {canSeeRoute && (
          <Pressable style={styles.routeBtn} onPress={() => setRouteOpen(true)}>
            <Truck size={15} color={colors.brand.primary} strokeWidth={2.4} />
            <View style={styles.routeBadge}>
              <Text style={styles.routeBadgeText}>{deliveringCount}</Text>
            </View>
          </Pressable>
        )}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isFetching && !ordersQuery.isLoading}
            onRefresh={() => { void ordersQuery.refetch(); }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        ListEmptyComponent={
          ordersQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing['4xl'] }} />
          ) : (
            <EmptyState
              icon={filter === 'done' ? Check : filter === 'progress' ? Truck : Package}
              title={EMPTY_MSG[filter].title}
              description={EMPTY_MSG[filter].desc}
            />
          )
        }
        renderItem={({ item }) => {
          const next = NEXT_STATUS[item.status];
          const isOpen = expanded[item.id];
          const itemCount = item.items.reduce((s, it) => s + it.quantity, 0);
          const customer = item.user?.name ?? item.user?.phone ?? null;
          return (
            <View style={[styles.card, { borderLeftColor: colors.status[item.status] }]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Pressable style={styles.numWrap} onPress={() => router.push(`/seller/order/${item.id}`)} hitSlop={6}>
                  <Text style={styles.orderNum}>#{item.orderNumber}</Text>
                  <ChevronRight size={14} color={colors.text.tertiary} strokeWidth={2.4} />
                </Pressable>
                <View style={styles.headerRight}>
                  <View style={[styles.statusBadge, { backgroundColor: colors.status[item.status] }]}>
                    <Text style={styles.statusText}>{tr(ORDER_STATUS_KEY[item.status])}</Text>
                  </View>
                  {(item.status === 'new' || item.status === 'accepted') && (
                    <Pressable
                      style={styles.cancelIcon}
                      hitSlop={8}
                      onPress={() => {
                        // A `new` order hasn't been accepted yet — declining it is
                        // seller_rejected (triggers the customer's "try another
                        // store" flow), distinct from cancelling an accepted one.
                        const isNew = item.status === 'new';
                        const nextStatus: OrderStatus = isNew ? 'seller_rejected' : 'cancelled';
                        Alert.alert(
                          isNew ? 'Buyurtmani rad etish' : tr('orders.cancel'),
                          isNew
                            ? `#${item.orderNumber} rad etilsinmi?`
                            : tr('orders.cancelConfirmNum', { n: item.orderNumber }),
                          [
                            { text: tr('common.no'), style: 'cancel' },
                            { text: tr('common.yes'), style: 'destructive', onPress: () => advance.mutate({ orderId: item.id, status: nextStatus }) },
                          ],
                        );
                      }}>
                      <X size={15} color={colors.feedback.danger} strokeWidth={2.8} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Time + customer */}
              <View style={styles.metaRow}>
                <Text style={styles.time}>{item.createdAt.slice(11, 16)}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.time}>{itemCount} dona</Text>
                {customer && (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <Phone size={11} color={colors.text.tertiary} strokeWidth={2} />
                    <Text style={styles.time} numberOfLines={1}>{customer}</Text>
                  </>
                )}
              </View>

              {item.status === 'new' && (
                <AutoCancelCountdown createdAt={item.createdAt} status={item.status} />
              )}

              {/* Accordion */}
              <Pressable
                style={styles.accordionToggle}
                onPress={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}>
                <Text style={styles.accordionLabel}>
                  {isOpen ? 'Yashirish' : `${item.items.length} xil mahsulot`}
                </Text>
                {isOpen
                  ? <ChevronUp size={15} color={colors.brand.primary} strokeWidth={2.4} />
                  : <ChevronDown size={15} color={colors.brand.primary} strokeWidth={2.4} />}
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
                            <Package size={14} color={colors.brand.primary} strokeWidth={1.7} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemName} numberOfLines={1}>{it.productName}</Text>
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
                <Text style={styles.total}>{fmt(item.total)} so'm</Text>
                <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${item.id}?shopId=${shopId}`)}>
                  <MessageCircle size={14} color={colors.brand.primary} strokeWidth={2.4} />
                  <Text style={styles.chatBtnText}>Chat</Text>
                </Pressable>
              </View>

              {item.status === 'delivering' && (
                <Pressable style={styles.returnBtn} onPress={() => router.push(`/seller/return/${item.id}`)}>
                  <RotateCcw size={14} color={colors.feedback.warning} strokeWidth={2.4} />
                  <Text style={styles.returnBtnText}>Qaytarilgan mahsulotni belgilash</Text>
                </Pressable>
              )}

              {next && (
                <Pressable
                  style={[styles.actionBtn, item.status === 'new' && styles.acceptBtn]}
                  onPress={() => { haptics.medium(); advance.mutate({ orderId: item.id, status: next.next }); }}>
                  {item.status === 'new' && <Check size={17} color={colors.text.onPrimary} strokeWidth={2.8} />}
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

      <Modal visible={routeOpen} transparent animationType="slide" onRequestClose={() => setRouteOpen(false)}>
        <View style={styles.routeOverlay}>
          <View style={styles.routeSheet}>
            <View style={styles.routeHeader}>
              <Text style={styles.routeTitle}>Yetkazib berish marshruti</Text>
              <Pressable onPress={() => setRouteOpen(false)} hitSlop={8}>
                <X size={22} color={colors.text.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
            {routeQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 32 }} />
            ) : !routeQuery.data?.stops.length ? (
              <View style={styles.routeEmpty}>
                <MapPin size={28} color={colors.text.tertiary} strokeWidth={1.8} />
                <Text style={styles.routeEmptyText}>Hozir yetkazilayotgan buyurtma yo'q</Text>
              </View>
            ) : (
              <>
                <MapView
                  ref={routeMapRef}
                  style={styles.routeMap}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  initialRegion={{
                    latitude: routeQuery.data.shopLocation.lat,
                    longitude: routeQuery.data.shopLocation.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}>
                  {/* Shop — the route's starting point (SPEC.md §27.2: green pin). */}
                  <Marker
                    coordinate={{
                      latitude: routeQuery.data.shopLocation.lat,
                      longitude: routeQuery.data.shopLocation.lng,
                    }}
                    pinColor="green"
                    title="Do'kon"
                    description="Marshrut boshlanish nuqtasi"
                  />
                  {routeQuery.data.stops.map((stop, i) => (
                    <RouteStopMarker key={stop.orderId} stop={stop} sequence={i + 1} />
                  ))}
                </MapView>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.routeList}>
                  {routeQuery.data.stops.map((stop, i) => (
                    <View key={stop.orderId} style={styles.stopRow}>
                      <View style={styles.stopIndex}>
                        <Text style={styles.stopIndexText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopName} numberOfLines={1}>
                          Buyurtma #{stop.orderNumber.slice(-6)}
                          {stop.customerPhone ? ` · ${stop.customerPhone}` : ''}
                        </Text>
                        <Text style={styles.stopAddr} numberOfLines={2}>{stop.address}</Text>
                        <Text style={styles.stopDist}>
                          {stop.distanceFromPreviousKm.toFixed(1)} km oldingi nuqtadan
                        </Text>
                      </View>
                      <Pressable
                        style={styles.directionsBtn}
                        onPress={() => openDirections(stop.lat, stop.lng)}>
                        <Navigation size={14} color={colors.brand.primary} strokeWidth={2.4} />
                        <Text style={styles.directionsBtnText}>Yo'l ko'rsat</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Numbered pin for one delivery stop, in the server's nearest-neighbor sequence. */
function RouteStopMarker({ stop, sequence }: { readonly stop: DeliveryRouteStop; readonly sequence: number }) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 700);
    return () => clearTimeout(id);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: stop.lat, longitude: stop.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      title={`#${stop.orderNumber.slice(-6)}`}
      description={stop.address}>
      <View style={styles.stopPin}>
        <Text style={styles.stopPinText}>{sequence}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },

  /* Filter tabs */
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  segmentActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  segmentText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  segmentTextActive: { color: colors.text.onPrimary },

  /* Count badge on tab */
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.30)' },
  badgeNew: { backgroundColor: colors.feedback.danger },
  badgeMuted: { backgroundColor: colors.bg.surfaceMuted, borderWidth: 1, borderColor: colors.border.default },
  badgeText: { fontSize: 10, fontWeight: '800', lineHeight: 13 },
  badgeTextLight: { color: '#fff' },
  badgeTextDark: { color: colors.text.secondary },

  /* Route button */
  routeBtn: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.feedback.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg.canvas,
  },
  routeBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  /* FAB */
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
  fabText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },

  /* List */
  list: { padding: layout.screenPadding, paddingBottom: 96, gap: spacing.md },

  /* Card */
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  orderNum: { ...typography.bodyStrong, color: colors.text.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 10, color: colors.text.onPrimary, fontWeight: '800' },
  cancelIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Meta row (time · items · customer) */
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  time: { ...typography.caption, color: colors.text.tertiary },
  dot: { ...typography.caption, color: colors.text.hint },

  /* Accordion */
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  accordionLabel: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
  preview: { ...typography.caption, color: colors.text.secondary },
  itemsExpanded: { gap: spacing.sm, marginTop: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemImageWrap: { width: 36, height: 36, borderRadius: radius.sm, overflow: 'hidden' },
  itemImage: { width: 36, height: 36, backgroundColor: colors.brand.primarySurface },
  itemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemName: { ...typography.caption, color: colors.text.primary, flex: 1 },
  itemQty: { ...typography.caption, fontWeight: '800', color: colors.text.primary },

  /* Total + chat */
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  total: { ...typography.h4, color: colors.brand.primary },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  chatBtnText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },

  /* Return + action */
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: layout.buttonHeight.sm,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.warningSurface,
    marginTop: spacing.xs,
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
    marginTop: spacing.xs,
  },
  acceptBtn: { backgroundColor: colors.feedback.success },
  actionBtnText: { ...typography.buttonSmall, color: colors.text.onPrimary },

  routeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  routeSheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '88%',
    gap: spacing.md,
  },
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeTitle: { ...typography.h3, color: colors.text.primary },
  routeEmpty: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.md },
  routeEmptyText: { ...typography.bodySmall, color: colors.text.secondary },
  routeMap: { width: '100%', height: 220, borderRadius: radius.lg, overflow: 'hidden' },
  routeList: { maxHeight: 320 },
  stopPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text.onPrimary,
    ...shadow.xs,
  },
  stopPinText: { fontSize: 12, fontWeight: '800', color: colors.text.onPrimary },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  stopIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stopIndexText: { ...typography.caption, color: colors.text.onPrimary, fontWeight: '800' },
  stopName: { ...typography.bodyStrong, color: colors.text.primary },
  stopAddr: { ...typography.caption, color: colors.text.secondary, marginTop: 2, lineHeight: 16 },
  stopDist: { ...typography.caption, color: colors.brand.primary, fontWeight: '700', marginTop: 2 },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  directionsBtnText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
});
