import { router } from 'expo-router';
import { AlertCircle, Check, MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { useTranslation } from '@/i18n';
import { ORDER_STATUS_KEY, Order } from '@/lib/types';
import { colors } from '@/theme';

interface OrderHeaderSectionProps {
  readonly order: Order;
  readonly isSellerDeclined: boolean;
  readonly isDeadOrder: boolean;
}

export function OrderHeaderSection({
  order,
  isSellerDeclined,
  isDeadOrder,
}: OrderHeaderSectionProps) {
  const { tr } = useTranslation();
  const statusColor = colors.status[order.status];

  return (
    <View className="gap-3">
      {/* Header Card */}
      <View className="bg-surface rounded-2xl p-4 items-center gap-2 border border-border-subtle shadow-xs">
        <Text className="text-xl font-extrabold text-text-primary">#{order.orderNumber}</Text>
        <View className="px-4 py-1.5 rounded-full" style={{ backgroundColor: statusColor }}>
          <Text className="text-xs font-extrabold text-white">{tr(ORDER_STATUS_KEY[order.status])}</Text>
        </View>
        <AutoCancelCountdown createdAt={order.createdAt} status={order.status} />
      </View>

      {/* Refund banners */}
      {order.refund && (
        <View className="bg-emerald-500/10 rounded-xl px-3.5 py-2.5 border border-feedback-success/30">
          <Text className="text-xs font-bold text-feedback-success">
            {tr('orderDet.refundedLine', {
              amount: order.refund.amount.toLocaleString(),
              date: new Date(order.refund.at).toLocaleDateString('uz-UZ'),
            })}
          </Text>
        </View>
      )}

      {order.refundedAt && (
        <View className="flex-row items-center gap-2 bg-emerald-500/10 rounded-xl px-3.5 py-2.5 border border-feedback-success/30">
          <Check size={16} color={colors.feedback.success} strokeWidth={2.6} />
          <Text className="text-xs font-bold text-feedback-success">{tr('orders.refundedBadge')}</Text>
        </View>
      )}

      {/* Seller declined banner */}
      {isSellerDeclined && (
        <View className="flex-row items-center gap-2 bg-amber-500/10 rounded-xl px-3.5 py-2.5 border border-feedback-warning/30">
          <AlertCircle size={18} color={colors.feedback.warning} strokeWidth={2.4} />
          <Text className="flex-1 text-xs font-bold text-feedback-warning">
            {tr(order.status === 'seller_no_response' ? 'orders.sellerNoResponseBanner' : 'orders.sellerRejectedBanner')}
          </Text>
        </View>
      )}

      {/* Contact Seller Button */}
      {!isDeadOrder && (
        <Pressable
          className="flex-row items-center justify-center gap-2 h-12 rounded-xl border border-brand-primary/30 bg-brand-primary/10 active:opacity-75"
          onPress={() => router.push(`/chat/${order.id}`)}>
          <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
          <Text className="text-sm font-bold text-brand-primary">{tr('orderDet.contactSeller')}</Text>
        </Pressable>
      )}
    </View>
  );
}
