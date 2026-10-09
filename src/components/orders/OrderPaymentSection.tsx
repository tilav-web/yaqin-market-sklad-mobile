import * as WebBrowser from 'expo-web-browser';
import { AlertCircle, Banknote, CreditCard } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { CardVisual } from '@/components/CardVisual';
import { Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, SavedCard } from '@/lib/types';
import { colors, typography } from '@/theme';
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
        <View
          className="p-3 rounded-2xl border gap-2"
          style={{
            backgroundColor: colors.bg.surface,
            borderColor: colors.border.subtle,
          }}
        >
          <Text style={[typography.bodyStrong, { color: colors.text.secondary }]}>
            {tr('checkout.paymentTitle')}
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                label={tr('checkout.cash')}
                leftIcon={Banknote}
                size="sm"
                variant={order.paymentMethod === 'cash' ? 'primary' : 'outline'}
                disabled={changePaymentMethodLoading || order.paymentMethod === 'cash'}
                onPress={() => onChangePaymentMethod('cash')}
              />
            </View>
            <View className="flex-1">
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
        <View
          className="flex-row items-center gap-2 rounded-xl px-3 py-2 border"
          style={{
            backgroundColor: colors.feedback.dangerSurface,
            borderColor: colors.feedback.danger,
          }}
        >
          <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
          <Text className="font-bold" style={[typography.bodySmall, { color: colors.feedback.danger }]}>
            {tr('checkout.paymentFailedBadge')}
          </Text>
        </View>
      )}

      {/* Saved cards retry */}
      {isOnlinePendingOrFailed &&
        activeCards.map((card) => (
          <View
            key={card.id}
            className="flex-row items-center justify-between p-3 rounded-2xl border"
            style={{
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.subtle,
            }}
          >
            <View className="flex-row items-center gap-3 flex-1">
              <CardVisual
                size="mini"
                brand={detectCardBrand(card.cardNumberMasked ?? '')}
                numberText={card.cardNumberMasked ?? '••••'}
                fallbackLabel={tr('cards.genericName')}
              />
              <Text className="text-[15px]" style={[typography.bodyStrong, { color: colors.text.primary }]} numberOfLines={1}>
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
        <View
          className="rounded-xl py-2 px-3 items-center border"
          style={{
            backgroundColor: colors.feedback.successSurface,
            borderColor: colors.feedback.success,
          }}
        >
          <Text className="font-bold" style={[typography.bodySmall, { color: colors.feedback.success }]}>
            {tr('checkout.paidBadge')}
          </Text>
        </View>
      )}
    </>
  );
}
