import { AlertCircle, RefreshCw, X } from 'lucide-react-native';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { colors } from '@/theme';

interface OrderStatusActionsProps {
  readonly order: Order;
  readonly showPaidStaleOptions: boolean;
  readonly onReRequest: () => void;
  readonly reRequestPending: boolean;
  readonly onConfirmReceived: () => void;
  readonly confirmReceivedPending: boolean;
  readonly onCancelOrder: () => void;
  readonly cancelPending: boolean;
  readonly canReorder: boolean;
  readonly isSellerDeclined: boolean;
  readonly onReorder: () => void;
}

export function OrderStatusActions({
  order,
  showPaidStaleOptions,
  onReRequest,
  reRequestPending,
  onConfirmReceived,
  confirmReceivedPending,
  onCancelOrder,
  cancelPending,
  canReorder,
  isSellerDeclined,
  onReorder,
}: OrderStatusActionsProps) {
  const { tr } = useTranslation();

  return (
    <View className="gap-3 pt-2">
      {/* Ignored paid order options */}
      {showPaidStaleOptions && (
        <View className="bg-amber-500/10 rounded-2xl p-4 border border-feedback-warning/30 gap-2.5">
          <View className="flex-row items-center gap-2">
            <AlertCircle size={18} color={colors.feedback.warning} strokeWidth={2.4} />
            <Text className="flex-1 text-sm font-bold text-feedback-warning">{tr('orders.noResponseTitle')}</Text>
          </View>
          <Text className="text-xs text-text-secondary leading-4">{tr('orders.noResponseHint')}</Text>
          <Pressable
            className="flex-row items-center justify-center gap-2 h-11 rounded-xl bg-surface border border-brand-primary active:opacity-75"
            onPress={onReRequest}
            disabled={reRequestPending}>
            <RefreshCw size={16} color={colors.brand.primary} strokeWidth={2.4} />
            <Text className="text-sm font-bold text-brand-primary">{tr('orders.reRequest')}</Text>
          </Pressable>
        </View>
      )}

      {/* Status action buttons */}
      {order.status === 'delivering' && (
        <Pressable
          className="h-12 rounded-xl bg-brand-primary items-center justify-center active:opacity-85"
          onPress={onConfirmReceived}
          disabled={confirmReceivedPending}>
          <Text className="text-base font-bold text-white">{tr('orders.confirmReceived')}</Text>
        </Pressable>
      )}

      {(order.status === 'new' || order.status === 'accepted') && (
        <Pressable
          className="flex-row items-center justify-center gap-2 h-11 rounded-xl bg-red-500/10 border border-feedback-danger/30 active:opacity-75"
          onPress={() =>
            Alert.alert(
              tr('orders.cancel'),
              order.paymentStatus === 'paid' ? tr('orders.cancelPaidConfirm') : tr('orders.cancelConfirm'),
              [
                { text: tr('common.no'), style: 'cancel' },
                { text: tr('common.yes'), style: 'destructive', onPress: onCancelOrder },
              ],
            )
          }
          disabled={cancelPending}>
          <X size={16} color={colors.feedback.danger} strokeWidth={2.6} />
          <Text className="text-sm font-bold text-feedback-danger">{tr('orders.cancel')}</Text>
        </Pressable>
      )}

      {canReorder && (
        <Pressable
          className="flex-row items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary active:opacity-75"
          onPress={onReorder}>
          <RefreshCw size={16} color={colors.brand.primary} strokeWidth={2.4} />
          <Text className="text-base font-bold text-brand-primary">
            {isSellerDeclined ? tr('orderDet.retrySameShop') : tr('orderDet.reorder')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
