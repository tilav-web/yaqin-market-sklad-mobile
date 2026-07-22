import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { AlertCircle, Check, CreditCard, MessageCircle, RefreshCw, RotateCcw, Star, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { useToast } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { endOrderActivity, updateOrderActivity } from '@/lib/useOrderLiveActivity';
import { useOrderSocket } from '@/lib/useOrderSocket';
import { useTranslation } from '@/i18n';
import { ORDER_STATUS_KEY, Order, OrderStatus, ProductOffer, PublicProductVariant, SavedCard } from '@/lib/types';
import { OrderActivityProps } from '@/widgets/order-activity';
import { useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const FLOW: OrderStatus[] = ['new', 'accepted', 'preparing', 'delivering', 'delivered'];

// Terminal: nothing further will happen to this order. Covers both a
// customer's own cancellation and the shop failing to accept it (which is a
// distinct case, see isSellerDeclined below and the suggestion flow it drives).
function isTerminalStatus(status: OrderStatus | undefined): boolean {
  return (
    status === 'delivered' ||
    status === 'cancelled' ||
    status === 'seller_no_response' ||
    status === 'seller_rejected'
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();

  const [reasonDraft, setReasonDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState<Record<string, string>>({});
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintCustomReason, setComplaintCustomReason] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');

  const orderQuery = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      // Stop polling once the order reaches a terminal state.
      return isTerminalStatus(s) ? false : 8000;
    },
  });

  const order = orderQuery.data;
  const isSellerDeclined = order?.status === 'seller_no_response' || order?.status === 'seller_rejected';
  const coords = useEffectiveCoords();
  const alternativesQueries = useQueries({
    queries: (order?.items ?? []).map((it) => ({
      queryKey: [
        'family-offers',
        it.productVariant?.globalProductId,
        order?.shopId,
        coords?.latitude,
        coords?.longitude,
      ],
      queryFn: async () => {
        const res = await api.get<ProductOffer[]>(
          `/catalog/global-products/${it.productVariant!.globalProductId}/family-offers`,
          { params: { lat: coords?.latitude, lng: coords?.longitude, excludeShopId: order!.shopId } },
        );
        return res.data;
      },
      enabled: isSellerDeclined && !!it.productVariant?.globalProductId,
      staleTime: 60_000,
    })),
  });
  const mapRef = useRef<MapView | null>(null);
  const { courierLocation } = useOrderSocket(order?.status === 'delivering' ? id : undefined);

  // Keep the camera centered on the courier as they move — `initialRegion`
  // only applies to the first render, so without this the pin quietly
  // wanders toward the map's edge as the courier gets closer.
  useEffect(() => {
    if (!courierLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: courierLocation.lat, longitude: courierLocation.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400,
    );
  }, [courierLocation]);

  useEffect(() => {
    if (!order) return;
    const props = {
      orderNumber: order.orderNumber,
      shopName: order.shop?.name ?? '',
      status: order.status as OrderActivityProps['status'],
    };
    if (isTerminalStatus(order.status)) {
      void endOrderActivity(props);
    } else {
      void updateOrderActivity(props);
    }
  }, [order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardsQuery = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => (await api.get<SavedCard[]>('/click/cards')).data,
    enabled: order?.paymentMethod === 'click_online' && order?.paymentStatus === 'pending',
  });

  const payWithCard = useMutation({
    mutationFn: async (cardId: string) => {
      await api.post(`/click/orders/${id}/pay-with-card`, { cardId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success("To'lov muvaffaqiyatli o'tdi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const setStatus = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const res = await api.patch<Order>(`/orders/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const submitReason = useMutation({
    mutationFn: async () => {
      const res = await api.post<Order>(`/orders/${id}/return-reason`, {
        reason: reasonDraft.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Rahmat, sabab saqlandi');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const submitReviews = useMutation({
    mutationFn: async () => {
      const items = Object.entries(ratingDraft)
        .filter(([, stars]) => stars > 0)
        .map(([productVariantId, stars]) => ({
          productVariantId,
          stars,
          text: reviewText[productVariantId]?.trim() || undefined,
        }));
      const res = await api.post(`/orders/${id}/reviews`, { items });
      return res.data;
    },
    onSuccess: () => {
      setRatingDraft({});
      setReviewText({});
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Baho uchun rahmat!');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const COMPLAINT_REASONS = [
    'Mahsulot yetkazilmadi',
    'Mahsulot sifatsiz',
    "Noto'g'ri mahsulot keldi",
    'Kam yetkazildi',
    'Boshqa',
  ];

  // Files a dispute within the server's settlement window (the exact
  // window length is not duplicated client-side — a closed window simply
  // surfaces as the server's rejection message via extractErrorMessage).
  const fileComplaint = useMutation({
    mutationFn: async () => {
      const reason =
        complaintReason === 'Boshqa' ? complaintCustomReason.trim() : complaintReason;
      const res = await api.post(`/orders/${id}/complaint`, {
        reason,
        description: complaintDesc.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Shikoyatingiz qabul qilindi');
      setComplaintOpen(false);
      setComplaintReason('');
      setComplaintCustomReason('');
      setComplaintDesc('');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const reviewed = useMemo(
    () => new Set(order?.reviewedVariantIds ?? []),
    [order?.reviewedVariantIds],
  );

  const addItem = useCartStore((s) => s.addItem);

  if (orderQuery.isLoading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  // Includes seller_no_response/seller_rejected — retrying the same shop is
  // one of the suggested options when it didn't accept the order.
  const canReorder = isTerminalStatus(order.status);

  const handleReorder = async () => {
    haptics.medium();
    const shopId = order.shopId;
    const shopName = order.shop?.name ?? '';

    // order.items carries this order's HISTORICAL price/no photo — cart
    // merging now trusts the newest addItem() call as the current truth
    // (fixes a stale-price bug elsewhere), so reordering must feed it
    // today's actual price, not what was charged last time.
    let current: PublicProductVariant[] = [];
    try {
      const res = await api.get<PublicProductVariant[]>(`/catalog/shops/${shopId}/products`);
      current = res.data;
    } catch {
      // Fall back to historical data below rather than blocking reorder entirely.
    }
    const currentById = new Map(current.map((v) => [v.id, v]));

    for (const it of order.items) {
      const live = currentById.get(it.productVariantId);
      addItem({
        variantId: it.productVariantId,
        shopId,
        shopName,
        productName: it.productName,
        unitPrice: live ? live.discountPrice ?? live.price : it.unitPrice,
        quantity: it.quantity,
        photoUrl: live?.photos[0] ?? it.productVariant?.photos[0],
      });
    }
    router.push(`/shop/${shopId}`);
  };

  const canReview = order.status === 'delivered';
  const canComplain = order.status === 'delivered' && !order.complaint;
  const canSubmitComplaint =
    complaintReason !== '' && (complaintReason !== 'Boshqa' || complaintCustomReason.trim() !== '');
  const hasReturns = order.items.some((i) => i.returnedQuantity > 0);
  const returnedTotal = order.items.reduce((sum, i) => sum + i.unitPrice * i.returnedQuantity, 0);
  const unreviewed = canReview ? order.items.filter((i) => !reviewed.has(i.productVariantId)) : [];
  const pendingRatings = Object.values(ratingDraft).filter((s) => s > 0).length;

  const statusColor = colors.status[order.status];
  // No further progress will happen and there's nothing to chat about or
  // track on a timeline — covers a plain cancel as well as the shop
  // declining/not responding (isSellerDeclined).
  const isDeadOrder = order.status === 'cancelled' || isSellerDeclined;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={orderQuery.isFetching && !orderQuery.isLoading}
            onRefresh={() => {
              void orderQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.orderNum}>#{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{tr(ORDER_STATUS_KEY[order.status])}</Text>
          </View>
          <AutoCancelCountdown createdAt={order.createdAt} status={order.status} />
        </View>

        {/* Admin force-refund — previously tracked in the DB but never shown
            to the customer (flagged in the previous session). */}
        {order.refund && (
          <View style={styles.refundBanner}>
            <Text style={styles.refundBannerText}>
              Qaytarilgan: {order.refund.amount.toLocaleString()} so'm · sana:{' '}
              {new Date(order.refund.at).toLocaleDateString('uz-UZ')}
            </Text>
          </View>
        )}

        {/* Seller didn't accept — distinct from a plain cancel: not the
            customer's fault, so offer a way forward instead of a dead end. */}
        {isSellerDeclined && (
          <View style={styles.declinedBanner}>
            <AlertCircle size={18} color={colors.feedback.warning} strokeWidth={2.4} />
            <Text style={styles.declinedBannerText}>
              {tr(order.status === 'seller_no_response' ? 'orders.sellerNoResponseBanner' : 'orders.sellerRejectedBanner')}
            </Text>
          </View>
        )}

        {isSellerDeclined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tr('orders.findElsewhereTitle')}</Text>
            {order.items.map((it, idx) => {
              const offers = (alternativesQueries[idx]?.data ?? []).slice(0, 5);
              if (offers.length === 0) return null;
              return (
                <View key={it.id} style={styles.altGroup}>
                  <Text style={styles.altGroupTitle}>{it.productName}</Text>
                  {offers.map((o) => (
                    <Pressable
                      key={o.variantId}
                      style={styles.offerRow}
                      onPress={() => {
                        haptics.selection();
                        router.push(`/product/${o.variantId}`);
                      }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.offerShop} numberOfLines={1}>{o.shopName}</Text>
                        <Text style={styles.offerMeta}>
                          {o.isOpen ? "Ochiq" : "Yopiq"}
                          {o.distanceKm != null
                            ? ` · ${o.distanceKm < 1 ? `${Math.round(o.distanceKm * 1000)} m` : `${o.distanceKm.toFixed(1)} km`}`
                            : ''}
                        </Text>
                      </View>
                      <Text style={styles.offerPrice}>
                        {(o.discountPrice ?? o.price).toLocaleString()} so'm
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
            {alternativesQueries.every((q) => !q.isLoading && (q.data?.length ?? 0) === 0) && (
              <Text style={styles.altEmpty}>{tr('orders.findElsewhereEmpty')}</Text>
            )}
          </View>
        )}

        {!isDeadOrder && (
          <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${order.id}`)}>
            <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={styles.chatBtnText}>Sotuvchi bilan bog'lanish</Text>
          </Pressable>
        )}

        {/* Timeline */}
        {!isDeadOrder && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bosqichlar</Text>
            {FLOW.map((s, idx) => {
              const event = order.timeline.find((e) => e.status === s);
              const active = event !== undefined;
              const isLast = idx === FLOW.length - 1;
              return (
                <View key={s} style={styles.tlRow}>
                  <View style={styles.tlGutter}>
                    <View style={[styles.tlDot, active && styles.tlDotActive]}>
                      {active && <Check size={11} color={colors.text.onPrimary} strokeWidth={3.5} />}
                    </View>
                    {!isLast && <View style={[styles.tlLine, active && styles.tlLineActive]} />}
                  </View>
                  <View style={styles.tlBody}>
                    <Text style={[styles.tlLabel, active && styles.tlLabelActive]}>
                      {tr(ORDER_STATUS_KEY[s])}
                    </Text>
                    {event && (
                      <Text style={styles.tlTime}>
                        {new Date(event.at).toLocaleString('uz-UZ', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mahsulotlar</Text>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.productName}</Text>
                <Text style={styles.itemQty}>
                  {it.quantity} × {it.unitPrice.toLocaleString()} so'm
                </Text>
                {it.returnedQuantity > 0 && (
                  <Text style={styles.returnedTag}>{it.returnedQuantity} ta qaytarilgan</Text>
                )}
              </View>
              <Text style={styles.itemTotal}>{it.lineTotal.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Return reason — optional, prompted after the courier marks returns */}
        {hasReturns && (
          <View style={styles.section}>
            <View style={styles.returnHeader}>
              <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Qaytarilgan mahsulotlar</Text>
            </View>
            {order.returnReason ? (
              <Text style={styles.reasonSaved}>"{order.returnReason}"</Text>
            ) : (
              <>
                <Text style={styles.reasonHint}>
                  Nega qaytardingiz? Sabab qoldirsangiz, do'kon yaxshilanadi (ixtiyoriy).
                </Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Masalan: pomidor chirigan edi"
                  placeholderTextColor={colors.text.hint}
                  value={reasonDraft}
                  onChangeText={setReasonDraft}
                  multiline
                />
                {reasonDraft.trim().length > 0 && (
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => submitReason.mutate()}
                    disabled={submitReason.isPending}>
                    {submitReason.isPending ? (
                      <ActivityIndicator color={colors.text.onPrimary} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Sababni saqlash</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* Summary — subTotal/total already reflect any partial return (the
            server recalculates and saves them when items are returned), so
            this always shows what the customer actually owes/paid. When
            there was a return, call that out explicitly with the refunded
            amount, derived from the per-item returnedQuantity already shown
            above — not invented. */}
        <View style={styles.section}>
          {hasReturns && (
            <>
              <Row
                label="Qaytarilgan"
                value={`− ${returnedTotal.toLocaleString()} so'm`}
                tone="warning"
              />
              <View style={styles.divider} />
            </>
          )}
          <Row label="Mahsulotlar" value={`${order.subTotal.toLocaleString()} so'm`} />
          <Row label="Yetkazib berish" value={`${order.deliveryFee.toLocaleString()} so'm`} />
          <Row label="Masofa" value={`${order.distanceKm.toFixed(2)} km`} />
          <View style={styles.divider} />
          <Row label={hasReturns ? "Yangi summa (qaytarishdan keyin)" : 'Jami'} value={`${order.total.toLocaleString()} so'm`} bold />
        </View>

        {/* Rating */}
        {canReview && unreviewed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mahsulotlarni baholang</Text>
            {unreviewed.map((it) => (
              <View key={it.id} style={styles.rateRow}>
                <Text style={styles.rateName}>{it.productName}</Text>
                <StarPicker
                  value={ratingDraft[it.productVariantId] ?? 0}
                  onChange={(v) => {
                    haptics.selection();
                    setRatingDraft((d) => ({ ...d, [it.productVariantId]: v }));
                  }}
                />
                {(ratingDraft[it.productVariantId] ?? 0) > 0 && (
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Izoh (ixtiyoriy)"
                    placeholderTextColor={colors.text.hint}
                    value={reviewText[it.productVariantId] ?? ''}
                    onChangeText={(t) =>
                      setReviewText((r) => ({ ...r, [it.productVariantId]: t }))
                    }
                  />
                )}
              </View>
            ))}
            {pendingRatings > 0 && (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => submitReviews.mutate()}
                disabled={submitReviews.isPending}>
                {submitReviews.isPending ? (
                  <ActivityIndicator color={colors.text.onPrimary} />
                ) : (
                  <Text style={styles.primaryBtnText}>Baholarni yuborish ({pendingRatings})</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {canReview && unreviewed.length === 0 && order.items.length > 0 && (
          <Text style={styles.allReviewed}>✓ Barcha mahsulotlar baholangan</Text>
        )}

        {/* Complaint — either its current status, or the filing form (only
            while delivered and within the server's dispute window; a closed
            window surfaces as the server's own rejection toast). */}
        {order.status === 'delivered' && order.complaint && (
          <View style={[styles.section, styles.complaintCard]}>
            <View style={styles.complaintHeader}>
              <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Shikoyat</Text>
            </View>
            <Text style={styles.complaintReasonText}>"{order.complaint.reason}"</Text>
            <View
              style={[
                styles.complaintStatusBadge,
                order.complaint.status === 'resolved'
                  ? styles.complaintStatusResolved
                  : styles.complaintStatusOpen,
              ]}>
              <Text
                style={[
                  styles.complaintStatusText,
                  order.complaint.status === 'resolved'
                    ? styles.complaintStatusTextResolved
                    : styles.complaintStatusTextOpen,
                ]}>
                {order.complaint.status === 'resolved' ? "✓ Hal qilindi" : 'Ko\'rib chiqilmoqda'}
              </Text>
            </View>
            {order.complaint.resolvedAt && (
              <Text style={styles.complaintMeta}>
                Hal qilingan sana: {new Date(order.complaint.resolvedAt).toLocaleDateString('uz-UZ')}
              </Text>
            )}
          </View>
        )}

        {canComplain && (
          <View style={styles.section}>
            {!complaintOpen ? (
              <Pressable style={styles.complaintOpenBtn} onPress={() => setComplaintOpen(true)}>
                <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
                <Text style={styles.complaintOpenBtnText}>Shikoyat qilish</Text>
              </Pressable>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Shikoyat sababi</Text>
                <View style={styles.wrap}>
                  {COMPLAINT_REASONS.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setComplaintReason(r)}
                      style={[styles.reasonChip, complaintReason === r && styles.reasonChipActive]}>
                      <Text
                        style={[
                          styles.reasonChipText,
                          complaintReason === r && styles.reasonChipTextActive,
                        ]}>
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {complaintReason === 'Boshqa' && (
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Sababni yozing"
                    placeholderTextColor={colors.text.hint}
                    value={complaintCustomReason}
                    onChangeText={setComplaintCustomReason}
                  />
                )}
                <TextInput
                  style={[styles.reviewInput, styles.complaintTextarea]}
                  placeholder="Qo'shimcha izoh (ixtiyoriy)"
                  placeholderTextColor={colors.text.hint}
                  value={complaintDesc}
                  onChangeText={setComplaintDesc}
                  multiline
                />
                <View style={styles.complaintActions}>
                  <Pressable
                    style={styles.ghostBtn}
                    onPress={() => {
                      setComplaintOpen(false);
                      setComplaintReason('');
                      setComplaintCustomReason('');
                      setComplaintDesc('');
                    }}>
                    <Text style={styles.ghostBtnText}>Bekor qilish</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.primaryBtn,
                      { flex: 1 },
                      !canSubmitComplaint && styles.primaryBtnDisabled,
                    ]}
                    disabled={!canSubmitComplaint || fileComplaint.isPending}
                    onPress={() => fileComplaint.mutate()}>
                    {fileComplaint.isPending ? (
                      <ActivityIndicator color={colors.text.onPrimary} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Yuborish</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {/* Courier map — shown while delivering */}
        {order.status === 'delivering' && courierLocation && (
          <View style={styles.mapCard}>
            <View style={styles.mapTitleRow}>
              <Text style={styles.mapTitle}>Kuryer joylashuvi</Text>
              {courierLocation.etaMinutes != null ? (
                <Text style={styles.mapEta}>~{courierLocation.etaMinutes} daqiqada yetib keladi</Text>
              ) : null}
            </View>
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={styles.map}
              initialRegion={{
                latitude: courierLocation.lat,
                longitude: courierLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}>
              <Marker
                coordinate={{ latitude: courierLocation.lat, longitude: courierLocation.lng }}
                title="Kuryer"
                pinColor={colors.brand.primary}
              />
              {order.deliveryAddress && (
                <Marker
                  coordinate={{
                    latitude: order.deliveryAddress.latitude,
                    longitude: order.deliveryAddress.longitude,
                  }}
                  title="Siz"
                  pinColor={colors.feedback.success}
                />
              )}
            </MapView>
          </View>
        )}

        {/* Saved-card retry — one tap, no redirect, for a pending online order */}
        {order.paymentMethod === 'click_online' &&
          order.paymentStatus === 'pending' &&
          (cardsQuery.data ?? [])
            .filter((c) => c.status === 'active')
            .map((card) => (
              <Pressable
                key={card.id}
                style={styles.clickBtn}
                disabled={payWithCard.isPending}
                onPress={() => payWithCard.mutate(card.id)}>
                {payWithCard.isPending ? (
                  <ActivityIndicator color={colors.text.onPrimary} />
                ) : (
                  <>
                    <CreditCard size={18} color={colors.text.onPrimary} strokeWidth={2.2} />
                    <Text style={styles.clickBtnText}>
                      {card.cardNumberMasked ?? '••••'} {tr('checkout.payWithCard')}
                    </Text>
                  </>
                )}
              </Pressable>
            ))}

        {/* Click payment button — the redirect fallback; demoted to a ghost
            button once a one-tap saved-card option is available above. */}
        {order.paymentMethod === 'click_online' && order.paymentStatus === 'pending' && (() => {
          const hasCards = (cardsQuery.data ?? []).some((c) => c.status === 'active');
          return (
            <Pressable
              style={hasCards ? styles.ghostBtn : styles.clickBtn}
              onPress={async () => {
                try {
                  const { data } = await api.get<{ url: string }>(`/click/orders/${order.id}/url`);
                  await WebBrowser.openBrowserAsync(data.url, { showTitle: true });
                  void qc.invalidateQueries({ queryKey: ['order', id] });
                } catch (e) {
                  toast.error(extractErrorMessage(e));
                }
              }}>
              <CreditCard
                size={18}
                color={hasCards ? colors.brand.primary : colors.text.onPrimary}
                strokeWidth={2.2}
              />
              <Text
                style={
                  hasCards
                    ? [styles.ghostBtnText, { color: colors.brand.primary }]
                    : styles.clickBtnText
                }>
                {hasCards ? tr('checkout.payWithRedirect') : "Click orqali to'lash"}
              </Text>
            </Pressable>
          );
        })()}
        {order.paymentMethod === 'click_online' && order.paymentStatus === 'paid' && (
          <View style={styles.paidBadge}>
            <Text style={styles.paidBadgeText}>✓ Click orqali to'langan</Text>
          </View>
        )}

        {/* Status actions */}
        {order.status === 'delivering' && (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => setStatus.mutate('delivered')}
            disabled={setStatus.isPending}>
            <Text style={styles.primaryBtnText}>Buyurtmani qabul qildim</Text>
          </Pressable>
        )}
        {(order.status === 'new' || order.status === 'accepted') && (
          <Pressable
            style={styles.ghostBtn}
            onPress={() =>
              Alert.alert(tr('orders.cancel'), tr('orders.cancelConfirm'), [
                { text: tr('common.no'), style: 'cancel' },
                { text: tr('common.yes'), style: 'destructive', onPress: () => setStatus.mutate('cancelled') },
              ])
            }
            disabled={setStatus.isPending}>
            <X size={16} color={colors.feedback.danger} strokeWidth={2.6} />
            <Text style={styles.ghostBtnText}>Bekor qilish</Text>
          </Pressable>
        )}

        {canReorder && (
          <Pressable style={styles.reorderBtn} onPress={handleReorder}>
            <RefreshCw size={16} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={styles.reorderBtnText}>
              {isSellerDeclined ? "Shu do'kondan qayta urinish" : 'Qayta buyurtma berish'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function StarPicker({ value, onChange }: { readonly value: number; readonly onChange: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={4}>
          <Star
            size={28}
            color={i <= value ? colors.feedback.warning : colors.border.default}
            fill={i <= value ? colors.feedback.warning : 'transparent'}
            strokeWidth={2}
          />
        </Pressable>
      ))}
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly bold?: boolean;
  readonly tone?: 'warning';
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.rowValueBold,
          tone === 'warning' && { color: colors.feedback.warning, fontWeight: '700' },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['4xl'] },
  headerCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  orderNum: { ...typography.h3 },
  statusBadge: { paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radius.full },
  statusText: { ...typography.caption, color: colors.text.onPrimary, fontWeight: '800' },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
  },
  chatBtnText: { ...typography.buttonSmall, color: colors.brand.primary },
  // refund banner
  refundBanner: {
    backgroundColor: colors.feedback.successSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.feedback.success,
  },
  refundBannerText: { ...typography.bodySmall, fontWeight: '700', color: colors.feedback.success },
  // seller-declined suggestion flow
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.feedback.warningSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.feedback.warning,
  },
  declinedBannerText: { ...typography.bodySmall, fontWeight: '700', color: colors.feedback.warning, flex: 1 },
  altGroup: { gap: spacing.xs },
  altGroupTitle: { ...typography.bodyStrong, fontSize: 13, color: colors.text.secondary },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  offerShop: { ...typography.bodyStrong, fontSize: 14 },
  offerMeta: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  offerPrice: { ...typography.bodyStrong, fontSize: 14, color: colors.brand.primary },
  altEmpty: { ...typography.bodySmall, color: colors.text.tertiary, fontStyle: 'italic' },
  // complaint
  complaintCard: { borderColor: colors.feedback.danger, borderWidth: 1.5 },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  complaintReasonText: { ...typography.body, color: colors.text.secondary, fontStyle: 'italic' },
  complaintStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  complaintStatusOpen: { backgroundColor: colors.feedback.warningSurface },
  complaintStatusResolved: { backgroundColor: colors.feedback.successSurface },
  complaintStatusText: { ...typography.caption, fontWeight: '800' },
  complaintStatusTextOpen: { color: colors.feedback.warning },
  complaintStatusTextResolved: { color: colors.feedback.success },
  complaintMeta: { ...typography.caption, color: colors.text.tertiary },
  complaintOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.feedback.danger,
  },
  complaintOpenBtnText: { ...typography.buttonSmall, color: colors.feedback.danger },
  complaintTextarea: { minHeight: 64, textAlignVertical: 'top' },
  complaintActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: colors.text.hint },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  reasonChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  reasonChipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  reasonChipTextActive: { color: colors.text.onPrimary },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: { ...typography.overline, color: colors.text.tertiary, marginBottom: spacing.xs },
  // timeline
  tlRow: { flexDirection: 'row', gap: spacing.md },
  tlGutter: { alignItems: 'center', width: 22 },
  tlDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.border.default, minHeight: 16 },
  tlLineActive: { backgroundColor: colors.brand.primary },
  tlBody: { flex: 1, paddingBottom: spacing.md },
  tlLabel: { ...typography.body, color: colors.text.tertiary },
  tlLabelActive: { color: colors.text.primary, fontWeight: '700' },
  tlTime: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  // items
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, gap: spacing.sm },
  itemName: { ...typography.bodyStrong, fontSize: 14 },
  itemQty: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  returnedTag: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700', marginTop: 2 },
  itemTotal: { ...typography.priceSmall },
  returnHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reasonSaved: { ...typography.body, color: colors.text.secondary, fontStyle: 'italic' },
  reasonHint: { ...typography.bodySmall, color: colors.text.secondary },
  // summary
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowLabelBold: { color: colors.text.primary, fontWeight: '700' },
  rowValue: { ...typography.body, fontWeight: '600' },
  rowValueBold: { ...typography.h3, color: colors.brand.primary },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: spacing.xs },
  // rating
  rateRow: { paddingVertical: spacing.sm, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  rateName: { ...typography.bodyStrong, fontSize: 14 },
  starRow: { flexDirection: 'row', gap: spacing.xs },
  reviewInput: {
    ...typography.body,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  allReviewed: {
    ...typography.bodySmall,
    color: colors.feedback.success,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // buttons
  primaryBtn: {
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  primaryBtnText: { ...typography.button, color: colors.text.onPrimary },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
  },
  ghostBtnText: { ...typography.buttonSmall, color: colors.feedback.danger },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
  },
  reorderBtnText: { ...typography.buttonSmall, color: colors.brand.primary },
  // courier map
  mapCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  mapTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  mapTitle: { ...typography.overline, color: colors.text.tertiary },
  mapEta: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
  map: { width: '100%', height: 220, borderRadius: radius.md },
  // click payment
  clickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: '#00B900',
    ...shadow.sm,
  },
  clickBtnText: { ...typography.button, color: colors.text.onPrimary },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: `${colors.feedback.success}18`,
    borderWidth: 1,
    borderColor: colors.feedback.success,
  },
  paidBadgeText: { ...typography.bodyStrong, color: colors.feedback.success },
});
