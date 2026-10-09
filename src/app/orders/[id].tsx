import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

import { FiscalReceiptModal } from '@/components/FiscalReceiptModal';
import {
  OrderAlternativesCard,
  OrderComplaintCard,
  OrderCourierMapCard,
  OrderHandshakeCard,
  OrderHeaderSection,
  OrderItemsCard,
  OrderPaymentSection,
  OrderReturnReasonCard,
  OrderReviewSection,
  OrderStatusActions,
  OrderStatusTimeline,
  OrderSummaryCard,
  useOrderDetailsMutations,
} from '@/components/orders';
import { useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { useCountdown } from '@/lib/useCountdown';
import { endOrderActivity, updateOrderActivity } from '@/lib/useOrderLiveActivity';
import { useOrderSocket } from '@/lib/useOrderSocket';
import { FiscalReceipt, Order, OrderStatus, ProductOffer, SavedCard } from '@/lib/types';
import { OrderActivityProps } from '@/widgets/order-activity';
import { useEffectiveCoords } from '@/stores/location';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  const cardsQuery = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => (await api.get<SavedCard[]>('/click/cards')).data,
    enabled:
      order?.paymentMethod === 'click_online' &&
      (order?.paymentStatus === 'pending' || order?.paymentStatus === 'failed'),
  });

  const mutations = useOrderDetailsMutations(id!, order);

  const paidStaleDeadline =
    order &&
    order.status === 'new' &&
    order.paymentMethod === 'click_online' &&
    order.paymentStatus === 'paid'
      ? new Date(order.reRequestedAt ?? order.createdAt).getTime() + 5 * 60 * 1000
      : Number.MAX_SAFE_INTEGER;
  const paidStaleRemaining = useCountdown(paidStaleDeadline);
  const showPaidStaleOptions = paidStaleRemaining === 0;

  const reviewed = useMemo(
    () => new Set(order?.reviewedVariantIds ?? []),
    [order?.reviewedVariantIds],
  );

  if (orderQuery.isLoading || !order) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const canReorder = isTerminalStatus(order.status);

  const canReview = order.status === 'delivered';
  const canComplain = order.status === 'delivered' && !order.complaint;
  const isDeadOrder = order.status === 'cancelled' || isSellerDeclined;
  const canChangePayment = order.paymentStatus !== 'paid' && !isTerminalStatus(order.status);
  const hasReturns = !isDeadOrder && order.items.some((i) => i.returnedQuantity > 0);
  const returnedTotal = order.items.reduce((sum, i) => sum + i.unitPrice * i.returnedQuantity, 0);
  const unreviewed = canReview ? order.items.filter((i) => !reviewed.has(i.productVariantId)) : [];

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={orderQuery.isFetching && !orderQuery.isLoading}
            onRefresh={() => void orderQuery.refetch()}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }>
        {/* Header & Status Section */}
        <OrderHeaderSection
          order={order}
          isSellerDeclined={isSellerDeclined}
          isDeadOrder={isDeadOrder}
        />

        {/* Alternatives Card */}
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

        {/* Timeline */}
        {!isDeadOrder && <OrderStatusTimeline timeline={order.timeline} />}

        {/* Order Items */}
        <OrderItemsCard items={order.items} hasReturns={hasReturns} />

        {/* Return Reason Prompt */}
        {hasReturns && (
          <OrderReturnReasonCard
            returnReason={order.returnReason}
            onSubmitReason={async (reason) => {
              await mutations.submitReason.mutateAsync(reason);
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
              await mutations.submitReviews.mutateAsync(items);
            }}
            onSubmitCourierRating={async (stars) => {
              await mutations.submitCourierRating.mutateAsync(stars);
            }}
            onSubmitShopRating={async (stars) => {
              await mutations.submitShopRating.mutateAsync(stars);
            }}
          />
        )}

        {/* Complaint Section */}
        <OrderComplaintCard
          complaint={order.complaint}
          canComplain={canComplain}
          onSubmitComplaint={async (reason, description) => {
            await mutations.fileComplaint.mutateAsync({ reason, description });
          }}
        />

        {/* QR Handshake */}
        {order.status === 'delivering' && handshakeQuery.data?.required && handshakeQuery.data.token && (
          <OrderHandshakeCard token={handshakeQuery.data.token} />
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
          onPayWithCard={(cardId) => mutations.payWithCard.mutate(cardId)}
          payWithCardLoading={mutations.payWithCard.isPending}
          onChangePaymentMethod={(method) => mutations.changePaymentMethod.mutate(method)}
          changePaymentMethodLoading={mutations.changePaymentMethod.isPending}
          onRefreshOrder={() => void qc.invalidateQueries({ queryKey: ['order', id] })}
          onError={(msg) => toast.error(msg)}
        />

        {/* Status Actions */}
        <OrderStatusActions
          order={order}
          showPaidStaleOptions={showPaidStaleOptions}
          onReRequest={() => mutations.reRequest.mutate()}
          reRequestPending={mutations.reRequest.isPending}
          onConfirmReceived={() => mutations.setStatus.mutate('delivered')}
          confirmReceivedPending={mutations.setStatus.isPending}
          onCancelOrder={() => mutations.setStatus.mutate('cancelled')}
          cancelPending={mutations.setStatus.isPending}
          canReorder={canReorder}
          isSellerDeclined={isSellerDeclined}
          onReorder={mutations.handleReorder}
        />
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
