import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  Check,
  MessageCircle,
  RefreshCw,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { FiscalReceiptModal } from '@/components/FiscalReceiptModal';
import { OrderAlternativesCard } from '@/components/orders/OrderAlternativesCard';
import { OrderComplaintCard } from '@/components/orders/OrderComplaintCard';
import { OrderCourierMapCard } from '@/components/orders/OrderCourierMapCard';
import { OrderItemsCard } from '@/components/orders/OrderItemsCard';
import { OrderPaymentSection } from '@/components/orders/OrderPaymentSection';
import { OrderReviewSection } from '@/components/orders/OrderReviewSection';
import { OrderReturnReasonCard } from '@/components/orders/OrderReturnReasonCard';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { OrderSummaryCard } from '@/components/orders/OrderSummaryCard';
import { useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { captureEvidence } from '@/lib/location-evidence';
import { useCountdown } from '@/lib/useCountdown';
import { endOrderActivity, updateOrderActivity } from '@/lib/useOrderLiveActivity';
import { useOrderSocket } from '@/lib/useOrderSocket';
import { FiscalReceipt, ORDER_STATUS_KEY, Order, OrderStatus, ProductOffer, PublicProductVariant, SavedCard } from '@/lib/types';
import { OrderActivityProps } from '@/widgets/order-activity';
import { useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

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

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return isTerminalStatus(s) ? false : 8000;
    },
  });

  const fiscalReceiptQuery = useQuery({
    queryKey: ['order-fiscal-receipt', id],
    queryFn: async () => {
      const res = await api.get<FiscalReceipt | null>(`/orders/${id}/fiscal-receipt`);
      return res.data;
    },
    enabled: !!id && (orderQuery.data?.paymentStatus === 'paid' || orderQuery.data?.status === 'delivered'),
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

  const { courierLocation } = useOrderSocket(order?.status === 'delivering' ? id : undefined);

  const handshakeQuery = useQuery({
    queryKey: ['order-handshake', id],
    queryFn: async () => {
      const res = await api.get<{ required: boolean; token?: string }>(`/orders/${id}/handshake`);
      return res.data;
    },
    enabled: order?.status === 'delivering' && !!order?.requiresHandshake,
    staleTime: 60_000,
  });

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
    enabled:
      order?.paymentMethod === 'click_online' &&
      (order?.paymentStatus === 'pending' || order?.paymentStatus === 'failed'),
  });

  const payWithCard = useMutation({
    mutationFn: async (cardId: string) => {
      await api.post(`/click/orders/${id}/pay-with-card`, { cardId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success(tr('orderDet.paySuccess'));
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const changePaymentMethod = useMutation({
    mutationFn: async (method: 'cash' | 'click_online') => {
      const res = await api.patch<Order>(`/orders/${id}/payment-method`, { paymentMethod: method });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const setStatus = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const evidence = status === 'delivered' ? await captureEvidence() : null;
      const res = await api.patch<Order>(`/orders/${id}/status`, {
        status,
        evidence: evidence ?? undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const reRequest = useMutation({
    mutationFn: async () => {
      const res = await api.post<Order>(`/orders/${id}/re-request`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success(tr('orders.reRequestSent'));
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const paidStaleDeadline =
    order &&
    order.status === 'new' &&
    order.paymentMethod === 'click_online' &&
    order.paymentStatus === 'paid'
      ? new Date(order.reRequestedAt ?? order.createdAt).getTime() + 5 * 60 * 1000
      : Number.MAX_SAFE_INTEGER;
  const paidStaleRemaining = useCountdown(paidStaleDeadline);
  const showPaidStaleOptions = paidStaleRemaining === 0;

  const submitReason = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.post<Order>(`/orders/${id}/return-reason`, { reason });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success(tr('orderDet.reasonThanks'));
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const submitReviews = useMutation({
    mutationFn: async (items: { productVariantId: string; stars: number; text?: string }[]) => {
      const res = await api.post(`/orders/${id}/reviews`, { items });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success(tr('orderDet.reviewThanks'));
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const submitCourierRating = useMutation({
    mutationFn: async (stars: number) => {
      const res = await api.post(`/orders/${id}/review-courier`, { stars });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success(tr('orderDet.reviewThanks'));
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const submitShopRating = useMutation({
    mutationFn: async (stars: number) => {
      const res = await api.post(`/orders/${id}/review-shop`, { stars });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success(tr('orderDet.reviewThanks'));
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const fileComplaint = useMutation({
    mutationFn: async ({ reason, description }: { reason: string; description?: string }) => {
      const res = await api.post(`/orders/${id}/complaint`, { reason, description });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success(tr('orderDet.complaintSent'));
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

  const canReorder = isTerminalStatus(order.status);

  const handleReorder = async () => {
    haptics.medium();
    const shopId = order.shopId;
    const shopName = order.shop?.name ?? '';

    let current: PublicProductVariant[] = [];
    try {
      const res = await api.get<PublicProductVariant[]>(`/catalog/shops/${shopId}/products`);
      current = res.data;
    } catch {
      // Fallback to historical prices if catalog lookup fails
    }
    const currentById = new Map(current.map((v) => [v.id, v]));

    for (const it of order.items) {
      const live = currentById.get(it.productVariantId);
      addItem({
        variantId: it.productVariantId,
        shopId,
        shopName,
        productName: getLocalizedText(it.productName),
        unitPrice: live ? live.discountPrice ?? live.price : it.unitPrice,
        quantity: it.quantity,
        photoUrl: live?.photos[0] ?? it.productVariant?.globalProduct?.photos?.[0],
      });
    }
    router.push(`/shop/${shopId}`);
  };

  const canReview = order.status === 'delivered';
  const canComplain = order.status === 'delivered' && !order.complaint;
  const statusColor = colors.status[order.status];
  const isDeadOrder = order.status === 'cancelled' || isSellerDeclined;
  const canChangePayment = order.paymentStatus !== 'paid' && !isTerminalStatus(order.status);
  const hasReturns = !isDeadOrder && order.items.some((i) => i.returnedQuantity > 0);
  const returnedTotal = order.items.reduce((sum, i) => sum + i.unitPrice * i.returnedQuantity, 0);
  const unreviewed = canReview ? order.items.filter((i) => !reviewed.has(i.productVariantId)) : [];

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

        {/* Refund banners */}
        {order.refund && (
          <View style={styles.refundBanner}>
            <Text style={styles.refundBannerText}>
              {tr('orderDet.refundedLine', {
                amount: order.refund.amount.toLocaleString(),
                date: new Date(order.refund.at).toLocaleDateString('uz-UZ'),
              })}
            </Text>
          </View>
        )}

        {order.refundedAt && (
          <View style={[styles.refundBanner, styles.refundBannerRow]}>
            <Check size={16} color={colors.feedback.success} strokeWidth={2.6} />
            <Text style={styles.refundBannerText}>{tr('orders.refundedBadge')}</Text>
          </View>
        )}

        {/* Seller declined banner */}
        {isSellerDeclined && (
          <View style={styles.declinedBanner}>
            <AlertCircle size={18} color={colors.feedback.warning} strokeWidth={2.4} />
            <Text style={styles.declinedBannerText}>
              {tr(order.status === 'seller_no_response' ? 'orders.sellerNoResponseBanner' : 'orders.sellerRejectedBanner')}
            </Text>
          </View>
        )}

        {/* Find elsewhere alternatives */}
        {isSellerDeclined && (
          <OrderAlternativesCard
            items={order.items}
            offersByItem={alternativesQueries.map((q) => q.data ?? [])}
            hasNoOffers={alternativesQueries.every((q) => !q.isLoading && (q.data?.length ?? 0) === 0)}
            onSelectProduct={(variantId) => {
              haptics.selection();
              router.push(`/product/${variantId}`);
            }}
          />
        )}

        {!isDeadOrder && (
          <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${order.id}`)}>
            <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={styles.chatBtnText}>{tr('orderDet.contactSeller')}</Text>
          </Pressable>
        )}

        {/* Timeline */}
        {!isDeadOrder && <OrderStatusTimeline timeline={order.timeline} />}

        {/* Order Items */}
        <OrderItemsCard items={order.items} hasReturns={hasReturns} />

        {/* Return Reason Prompt */}
        {hasReturns && (
          <OrderReturnReasonCard
            returnReason={order.returnReason}
            onSubmitReason={async (reason) => {
              await submitReason.mutateAsync(reason);
            }}
          />
        )}

        {/* Summary Card */}
        <OrderSummaryCard
          order={order}
          hasReturns={hasReturns}
          returnedTotal={returnedTotal}
          onOpenReceipt={() => setReceiptModalOpen(true)}
        />

        {/* Review Section */}
        {canReview && (
          <OrderReviewSection
            unreviewedItems={unreviewed}
            allReviewed={unreviewed.length === 0 && order.items.length > 0}
            hasDeliveredCourier={!!order.deliveredByUserId}
            courierReviewed={!!order.courierReviewed}
            shopReviewed={!!order.shopReviewed}
            onSubmitProductReviews={async (items) => {
              await submitReviews.mutateAsync(items);
            }}
            onSubmitCourierRating={async (stars) => {
              await submitCourierRating.mutateAsync(stars);
            }}
            onSubmitShopRating={async (stars) => {
              await submitShopRating.mutateAsync(stars);
            }}
          />
        )}

        {/* Complaint Section */}
        <OrderComplaintCard
          complaint={order.complaint}
          canComplain={canComplain}
          onSubmitComplaint={async (reason, description) => {
            await fileComplaint.mutateAsync({ reason, description });
          }}
        />

        {/* QR Handshake */}
        {order.status === 'delivering' && handshakeQuery.data?.required && handshakeQuery.data.token && (
          <View style={styles.handshakeCard}>
            <Text style={styles.handshakeTitle}>{tr('orderDet.handshakeTitle')}</Text>
            <Text style={styles.handshakeBody}>{tr('orderDet.handshakeBody')}</Text>
            <View style={styles.handshakeQrWrap}>
              <QRCode value={`yaqinmarket://order/receive?token=${handshakeQuery.data.token}`} size={180} />
            </View>
          </View>
        )}

        {/* Courier Live GPS Map */}
        {order.status === 'delivering' && courierLocation && (
          <OrderCourierMapCard
            courierLocation={courierLocation}
            deliveryAddress={order.deliveryAddress}
          />
        )}

        {/* Payment & Cards */}
        <OrderPaymentSection
          order={order}
          canChangePayment={canChangePayment}
          isTerminal={isTerminalStatus(order.status)}
          cards={cardsQuery.data ?? []}
          onPayWithCard={(cardId) => payWithCard.mutate(cardId)}
          payWithCardLoading={payWithCard.isPending}
          onChangePaymentMethod={(method) => changePaymentMethod.mutate(method)}
          changePaymentMethodLoading={changePaymentMethod.isPending}
          onRefreshOrder={() => void qc.invalidateQueries({ queryKey: ['order', id] })}
          onError={(msg) => toast.error(msg)}
        />

        {/* Ignored paid order options */}
        {showPaidStaleOptions && (
          <View style={styles.noRespCard}>
            <View style={styles.noRespHeader}>
              <AlertCircle size={18} color={colors.feedback.warning} strokeWidth={2.4} />
              <Text style={styles.noRespTitle}>{tr('orders.noResponseTitle')}</Text>
            </View>
            <Text style={styles.noRespHint}>{tr('orders.noResponseHint')}</Text>
            <Pressable
              style={styles.reRequestBtn}
              onPress={() => reRequest.mutate()}
              disabled={reRequest.isPending}>
              <RefreshCw size={16} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={styles.reRequestBtnText}>{tr('orders.reRequest')}</Text>
            </Pressable>
          </View>
        )}

        {/* Status action buttons */}
        {order.status === 'delivering' && (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => setStatus.mutate('delivered')}
            disabled={setStatus.isPending}>
            <Text style={styles.primaryBtnText}>{tr('orders.confirmReceived')}</Text>
          </Pressable>
        )}

        {(order.status === 'new' || order.status === 'accepted') && (
          <Pressable
            style={styles.ghostBtn}
            onPress={() =>
              Alert.alert(
                tr('orders.cancel'),
                order.paymentStatus === 'paid' ? tr('orders.cancelPaidConfirm') : tr('orders.cancelConfirm'),
                [
                  { text: tr('common.no'), style: 'cancel' },
                  { text: tr('common.yes'), style: 'destructive', onPress: () => setStatus.mutate('cancelled') },
                ],
              )
            }
            disabled={setStatus.isPending}>
            <X size={16} color={colors.feedback.danger} strokeWidth={2.6} />
            <Text style={styles.ghostBtnText}>{tr('orders.cancel')}</Text>
          </Pressable>
        )}

        {canReorder && (
          <Pressable style={styles.reorderBtn} onPress={handleReorder}>
            <RefreshCw size={16} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={styles.reorderBtnText}>
              {isSellerDeclined ? tr('orderDet.retrySameShop') : tr('orderDet.reorder')}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <FiscalReceiptModal
        visible={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={fiscalReceiptQuery.data ?? null}
        loading={fiscalReceiptQuery.isLoading}
      />
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
  refundBanner: {
    backgroundColor: colors.feedback.successSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.feedback.success,
  },
  refundBannerText: { ...typography.bodySmall, fontWeight: '700', color: colors.feedback.success, flex: 1 },
  refundBannerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noRespCard: {
    backgroundColor: colors.feedback.warningSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.feedback.warning,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noRespHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noRespTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.feedback.warning, flex: 1 },
  noRespHint: { ...typography.bodySmall, color: colors.text.secondary },
  reRequestBtn: {
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
  reRequestBtnText: { ...typography.buttonSmall, color: colors.brand.primary },
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
  handshakeCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    gap: spacing.sm,
  },
  handshakeTitle: { ...typography.h3, fontSize: 16 },
  handshakeBody: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center' },
  handshakeQrWrap: { padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: radius.md, marginTop: spacing.xs },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { ...typography.button, color: colors.text.onPrimary },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.feedback.danger,
    backgroundColor: colors.feedback.dangerSurface,
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
});
