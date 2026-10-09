import { router } from 'expo-router';
import { Ban, MessageCircle, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order, OrderStatus } from '@/lib/types';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';
import { NEXT_STATUS } from './types';

interface SellerOrderActionsSectionProps {
  order: Order;
  isOwner?: boolean;
  onAdvance: (status: OrderStatus) => void;
  onReject: () => void;
  onCancel: () => void;
  onBlock: () => void;
  onTriggerHandshake: () => void;
}

export function SellerOrderActionsSection({
  order,
  isOwner,
  onAdvance,
  onReject,
  onCancel,
  onBlock,
  onTriggerHandshake,
}: SellerOrderActionsSectionProps) {
  const { tr } = useTranslation();

  const next = NEXT_STATUS[order.status];
  const cancellable = order.status === 'new' || order.status === 'accepted';

  return (
    <>
      {/* Chat button */}
      <Pressable
        className="flex-row items-center justify-center gap-1.5 h-12 rounded-xl bg-brand-primary/10 active:opacity-75"
        onPress={() => router.push(`/chat/${order.id}`)}
      >
        <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
        <Text className="text-base font-bold text-brand-primary">{tr('sellerOrder.chatWithCustomer')}</Text>
      </Pressable>

      {/* Return button */}
      {order.status === 'delivering' ? (
        <Pressable
          className="flex-row items-center justify-center gap-1.5 h-9 rounded-xl bg-feedback-warning/10 active:opacity-75"
          onPress={() => router.push(`/seller/return/${order.id}`)}
        >
          <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
          <Text className="text-sm font-bold text-feedback-warning">{tr('sellerOrder.markReturn')}</Text>
        </Pressable>
      ) : null}

      {/* Advance status button */}
      {next ? (
        <Pressable
          className="h-14 rounded-2xl bg-feedback-success items-center justify-center active:opacity-85"
          onPress={() => {
            if (next.next === 'delivered' && order.requiresHandshake) {
              onTriggerHandshake();
              return;
            }
            haptics.medium();
            onAdvance(next.next);
          }}
        >
          <Text className="text-base font-extrabold text-text-on-primary">{tr(next.label)} →</Text>
        </Pressable>
      ) : null}

      {/* Destructive zone */}
      {cancellable || (order.user && isOwner !== false) ? (
        <View className="mt-8 pt-4 border-t border-border-subtle gap-2">
          {cancellable ? (
            order.status === 'new' ? (
              <Pressable
                className="h-12 rounded-xl border border-feedback-danger items-center justify-center active:opacity-75"
                onPress={() =>
                  Alert.alert(tr('sellerOrder.rejectTitle'), tr('sellerOrder.rejectConfirm'), [
                    { text: tr('common.no'), style: 'cancel' },
                    { text: tr('common.yes'), style: 'destructive', onPress: onReject },
                  ])
                }
              >
                <Text className="text-sm font-bold text-feedback-danger">{tr('sellerOrder.rejectTitle')}</Text>
              </Pressable>
            ) : (
              <Pressable
                className="h-12 rounded-xl border border-feedback-danger items-center justify-center active:opacity-75"
                onPress={() =>
                  Alert.alert(tr('orders.cancel'), tr('orders.cancelConfirm'), [
                    { text: tr('common.no'), style: 'cancel' },
                    { text: tr('common.yes'), style: 'destructive', onPress: onCancel },
                  ])
                }
              >
                <Text className="text-sm font-bold text-feedback-danger">{tr('sellerOrder.cancelOrder')}</Text>
              </Pressable>
            )
          ) : null}
          {order.user && isOwner !== false ? (
            <Pressable
              className="flex-row items-center justify-center gap-1.5 py-2 active:opacity-75"
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
                      onPress: onBlock,
                    },
                  ],
                )
              }
            >
              <Ban size={15} color={colors.text.danger} strokeWidth={2.3} />
              <Text className="text-sm font-semibold text-feedback-danger">{tr('sellerOrder.blockCustomer')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );
}
