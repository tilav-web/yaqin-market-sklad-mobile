import { router } from 'expo-router';
import { Ban, MessageCircle, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order, OrderStatus } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
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
      <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${order.id}`)}>
        <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
        <Text style={styles.chatText}>{tr('sellerOrder.chatWithCustomer')}</Text>
      </Pressable>

      {/* Return button */}
      {order.status === 'delivering' ? (
        <Pressable style={styles.returnBtn} onPress={() => router.push(`/seller/return/${order.id}`)}>
          <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
          <Text style={styles.returnText}>{tr('sellerOrder.markReturn')}</Text>
        </Pressable>
      ) : null}

      {/* Advance status button */}
      {next ? (
        <Pressable
          style={styles.acceptBtn}
          onPress={() => {
            if (next.next === 'delivered' && order.requiresHandshake) {
              onTriggerHandshake();
              return;
            }
            haptics.medium();
            onAdvance(next.next);
          }}
        >
          <Text style={styles.acceptText}>{tr(next.label)} →</Text>
        </Pressable>
      ) : null}

      {/* Destructive zone */}
      {cancellable || (order.user && isOwner !== false) ? (
        <View style={styles.dangerZone}>
          {cancellable ? (
            order.status === 'new' ? (
              <Pressable
                style={styles.cancelBtn}
                onPress={() =>
                  Alert.alert(tr('sellerOrder.rejectTitle'), tr('sellerOrder.rejectConfirm'), [
                    { text: tr('common.no'), style: 'cancel' },
                    { text: tr('common.yes'), style: 'destructive', onPress: onReject },
                  ])
                }
              >
                <Text style={styles.cancelText}>{tr('sellerOrder.rejectTitle')}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.cancelBtn}
                onPress={() =>
                  Alert.alert(tr('orders.cancel'), tr('orders.cancelConfirm'), [
                    { text: tr('common.no'), style: 'cancel' },
                    { text: tr('common.yes'), style: 'destructive', onPress: onCancel },
                  ])
                }
              >
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
                      onPress: onBlock,
                    },
                  ],
                )
              }
            >
              <Ban size={15} color={colors.text.danger} strokeWidth={2.3} />
              <Text style={styles.blockText}>{tr('sellerOrder.blockCustomer')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
});
