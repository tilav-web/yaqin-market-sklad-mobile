import * as WebBrowser from 'expo-web-browser';
import { AlertCircle, Banknote, CreditCard } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CardVisual } from '@/components/CardVisual';
import { Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, SavedCard } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { detectCardBrand } from '@/utils/cardBrand';

interface OrderPaymentSectionProps {
  order: Order;
  canChangePayment: boolean;
  isTerminal: boolean;
  cards: SavedCard[];
  onPayWithCard: (cardId: string) => void;
  payWithCardLoading: boolean;
  onChangePaymentMethod: (method: 'cash' | 'click_online') => void;
  changePaymentMethodLoading: boolean;
  onRefreshOrder: () => void;
  onError: (msg: string) => void;
}

export function OrderPaymentSection({
  order,
  canChangePayment,
  isTerminal,
  cards,
  onPayWithCard,
  payWithCardLoading,
  onChangePaymentMethod,
  changePaymentMethodLoading,
  onRefreshOrder,
  onError,
}: OrderPaymentSectionProps) {
  const { tr } = useTranslation();

  const activeCards = cards.filter((c) => c.status === 'active');
  const isOnlinePendingOrFailed =
    order.paymentMethod === 'click_online' &&
    (order.paymentStatus === 'pending' || order.paymentStatus === 'failed') &&
    !isTerminal;

  return (
    <>
      {/* Switch cash <-> card any time before payment actually succeeds */}
      {canChangePayment && (
        <View style={styles.paymentSwitchRow}>
          <Text style={styles.paymentSwitchLabel}>{tr('checkout.paymentTitle')}</Text>
          <View style={styles.paymentSwitchOptions}>
            <View style={styles.paymentOption}>
              <Button
                label={tr('checkout.cash')}
                leftIcon={Banknote}
                size="sm"
                variant={order.paymentMethod === 'cash' ? 'primary' : 'outline'}
                disabled={changePaymentMethodLoading || order.paymentMethod === 'cash'}
                onPress={() => onChangePaymentMethod('cash')}
              />
            </View>
            <View style={styles.paymentOption}>
              <Button
                label={tr('checkout.cardPayment')}
                leftIcon={CreditCard}
                size="sm"
                variant={order.paymentMethod === 'click_online' ? 'primary' : 'outline'}
                disabled={changePaymentMethodLoading || order.paymentMethod === 'click_online'}
                onPress={() => onChangePaymentMethod('click_online')}
              />
            </View>
          </View>
        </View>
      )}

      {/* Failed charge banner */}
      {order.paymentMethod === 'click_online' && order.paymentStatus === 'failed' && (
        <View style={styles.failedBadge}>
          <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
          <Text style={styles.failedBadgeText}>{tr('checkout.paymentFailedBadge')}</Text>
        </View>
      )}

      {/* Saved cards retry */}
      {isOnlinePendingOrFailed &&
        activeCards.map((card) => (
          <View key={card.id} style={styles.savedCardRow}>
            <View style={styles.savedCardInfo}>
              <CardVisual
                size="mini"
                brand={detectCardBrand(card.cardNumberMasked ?? '')}
                numberText={card.cardNumberMasked ?? '••••'}
                fallbackLabel={tr('cards.genericName')}
              />
              <Text style={styles.savedCardNumber} numberOfLines={1}>
                {card.cardNumberMasked ?? '••••'}
              </Text>
            </View>
            <Button
              label={tr('checkout.payAction')}
              size="sm"
              variant="primary"
              loading={payWithCardLoading}
              onPress={() => onPayWithCard(card.id)}
            />
          </View>
        ))}

      {/* Click redirect button */}
      {isOnlinePendingOrFailed && (
        <Button
          label={activeCards.length > 0 ? tr('checkout.payWithRedirect') : tr('checkout.cardPayment')}
          leftIcon={CreditCard}
          size={activeCards.length > 0 ? 'sm' : 'md'}
          variant={activeCards.length > 0 ? 'ghost' : 'primary'}
          onPress={async () => {
            try {
              const { data } = await api.get<{ url: string }>(`/click/orders/${order.id}/url`);
              await WebBrowser.openBrowserAsync(data.url, { showTitle: true });
              onRefreshOrder();
            } catch (e) {
              onError(extractErrorMessage(e));
            }
          }}
        />
      )}

      {order.paymentMethod === 'click_online' && order.paymentStatus === 'paid' && !order.refundedAt && (
        <View style={styles.paidBadge}>
          <Text style={styles.paidBadgeText}>{tr('checkout.paidBadge')}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  paymentSwitchRow: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.sm,
  },
  paymentSwitchLabel: { ...typography.bodyStrong, color: colors.text.secondary },
  paymentSwitchOptions: { flexDirection: 'row', gap: spacing.sm },
  paymentOption: { flex: 1 },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.feedback.dangerSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.feedback.danger,
  },
  failedBadgeText: { ...typography.bodySmall, color: colors.feedback.danger, fontWeight: '700' },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  savedCardInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  savedCardNumber: { ...typography.bodyStrong, fontSize: 15 },
  paidBadge: {
    backgroundColor: colors.feedback.successSurface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.feedback.success,
  },
  paidBadgeText: { ...typography.bodySmall, color: colors.feedback.success, fontWeight: '700' },
});
