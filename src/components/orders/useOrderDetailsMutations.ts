import { useMutation, useQueryClient } from '@tanstack/react-query';

import { router } from 'expo-router';

import { useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { captureEvidence } from '@/lib/location-evidence';
import { Order, OrderStatus, PublicProductVariant } from '@/lib/types';
import { useCartStore } from '@/stores/cart';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

export function useOrderDetailsMutations(id: string, order?: Order) {
  const qc = useQueryClient();
  const toast = useToast();
  const { tr } = useTranslation();

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

  const addItem = useCartStore((s) => s.addItem);

  const handleReorder = async () => {
    if (!order) return;
    haptics.medium();
    const shopId = order.shopId;
    const shopName = order.shop?.name ?? '';

    // Clear any previous cart to maintain single-shop policy
    useCartStore.getState().clearAll();

    let current: PublicProductVariant[] = [];
    try {
      const res = await api.get<PublicProductVariant[]>(`/catalog/shops/${shopId}/products`);
      current = res.data;
    } catch {
      // Fallback
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

  return {
    payWithCard,
    changePaymentMethod,
    setStatus,
    reRequest,
    submitReason,
    submitReviews,
    submitCourierRating,
    submitShopRating,
    fileComplaint,
    handleReorder,
  };
}
