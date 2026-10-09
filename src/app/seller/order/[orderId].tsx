import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Navigation } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import {
  SellerOrderActionsSection,
  SellerOrderCourierCard,
  SellerOrderCustomerCard,
  SellerOrderItemsCard,
  SellerOrderTotalsCard,
  useCourierTracking,
} from '@/components/seller-order-detail';
import { StaffMember } from '@/constants/staffPermissions';
import { useAdvanceOrderStatus } from '@/hooks/use-advance-order-status';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { ORDER_STATUS_KEY, Order, OrderItem, OrderStatus } from '@/lib/types';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { useAlarmState } from '@/stores/alarmState';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function SellerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
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
  const [markingItem, setMarkingItem] = useState<OrderItem | null>(null);
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
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  // QR handshake
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
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const handleAdvance = (status: OrderStatus) => {
    advance.mutate({ orderId: order.id, status, deliveryAddress: order.deliveryAddress });
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        {/* Status header */}
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-text-primary">#{order.orderNumber}</Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: colors.status[order.status] }}
          >
            <Text className="text-xs text-white font-extrabold">{tr(ORDER_STATUS_KEY[order.status])}</Text>
          </View>
        </View>
        <Text className="text-xs text-text-tertiary -mt-2">
          {order.createdAt.slice(0, 16).replace('T', ' ')}
        </Text>
        <AutoCancelCountdown createdAt={order.createdAt} status={order.status} />

        {isTracking && (
          <View className="flex-row items-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500 self-start">
            <Navigation size={13} color={colors.feedback.success} strokeWidth={2.4} />
            <Text className="text-xs font-bold text-emerald-600">{tr('sellerOrder.locationSharing')}</Text>
          </View>
        )}
        {needsEnable && (
          <Pressable
            className="flex-row items-center gap-1.5 py-1 px-3 rounded-full bg-amber-50 border border-amber-500 self-start"
            onPress={enableTracking}
          >
            <Navigation size={13} color={colors.feedback.warning} strokeWidth={2.4} />
            <Text className="text-xs font-bold text-amber-700">{tr('risk.trackingOffBanner')}</Text>
            <Text className="text-xs font-extrabold text-amber-700 underline ml-0.5">{tr('risk.trackingEnable')}</Text>
          </Pressable>
        )}

        {/* Customer */}
        <SellerOrderCustomerCard order={order} />

        {/* Courier assignment (delivery orders) */}
        <SellerOrderCourierCard
          order={order}
          staffList={staffQuery.data ?? []}
          onAssign={(staffId) => assign.mutate(staffId)}
        />

        {/* Items with images */}
        <SellerOrderItemsCard
          order={order}
          onOpenMarkingScanner={openMarkingScanner}
          isSavingMarking={saveMarking.isPending}
        />

        {/* Totals */}
        <SellerOrderTotalsCard order={order} />

        {/* Actions & destructive options */}
        <SellerOrderActionsSection
          order={order}
          isOwner={isOwner}
          onAdvance={handleAdvance}
          onReject={() => advance.mutate({ orderId: order.id, status: 'seller_rejected' })}
          onCancel={() => advance.mutate({ orderId: order.id, status: 'cancelled' })}
          onBlock={() => block.mutate()}
          onTriggerHandshake={() => setHandshakeScanOpen(true)}
        />
      </ScrollView>

      {/* Markirovka (Data Matrix) skaneri */}
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

      {/* QR handshake */}
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
