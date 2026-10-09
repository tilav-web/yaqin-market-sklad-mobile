import { router } from 'expo-router';
import { CreditCard, Wallet } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { CardVisual } from '@/components/CardVisual';
import { useTranslation } from '@/i18n';
import { SavedCard } from '@/lib/types';
import { colors, shadow, typography } from '@/theme';
import { detectCardBrand } from '@/utils/cardBrand';
import { haptics } from '@/utils/haptics';

interface CheckoutPaymentSectionProps {
  paymentMethod: 'cash' | 'click_online';
  onSelectPaymentMethod: (method: 'cash' | 'click_online') => void;
  activeCards: SavedCard[];
  selectedCardId: string | null;
  onSelectCardId: (id: string | null) => void;
}

export function CheckoutPaymentSection({
  paymentMethod,
  onSelectPaymentMethod,
  activeCards,
  selectedCardId,
  onSelectCardId,
}: CheckoutPaymentSectionProps) {
  const { tr } = useTranslation();

  return (
    <View
      className="p-4 rounded-2xl border"
      style={[{ backgroundColor: colors.bg.surface, borderColor: colors.border.subtle }, shadow.xs]}
    >
      <Pressable
        className="flex-row items-center gap-3 p-3 rounded-xl border-[1.5px] mb-2"
        style={{
          borderColor: paymentMethod === 'cash' ? colors.brand.primary : colors.border.subtle,
          backgroundColor: paymentMethod === 'cash' ? colors.brand.primarySurface : 'transparent',
        }}
        onPress={() => {
          haptics.selection();
          onSelectPaymentMethod('cash');
        }}
      >
        <Wallet
          size={18}
          color={paymentMethod === 'cash' ? colors.brand.primary : colors.text.tertiary}
          strokeWidth={2.2}
        />
        <Text
          className="flex-1 font-semibold"
          style={[typography.body, { color: paymentMethod === 'cash' ? colors.brand.primary : undefined }]}
        >
          {tr('checkout.cash')}
        </Text>
        <View
          className="w-5 h-5 rounded-full border-2 items-center justify-center"
          style={{ borderColor: paymentMethod === 'cash' ? colors.brand.primary : colors.border.strong }}
        >
          {paymentMethod === 'cash' && (
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
          )}
        </View>
      </Pressable>

      <Pressable
        className="flex-row items-center gap-3 p-3 rounded-xl border-[1.5px]"
        style={{
          borderColor: paymentMethod === 'click_online' ? colors.brand.primary : colors.border.subtle,
          backgroundColor: paymentMethod === 'click_online' ? colors.brand.primarySurface : 'transparent',
        }}
        onPress={() => {
          haptics.selection();
          onSelectPaymentMethod('click_online');
        }}
      >
        <CreditCard
          size={18}
          color={paymentMethod === 'click_online' ? colors.brand.primary : colors.text.tertiary}
          strokeWidth={2.2}
        />
        <Text
          className="flex-1 font-semibold"
          style={[typography.body, { color: paymentMethod === 'click_online' ? colors.brand.primary : undefined }]}
        >
          {tr('checkout.cardPayment')}
        </Text>
        <View
          className="w-5 h-5 rounded-full border-2 items-center justify-center"
          style={{ borderColor: paymentMethod === 'click_online' ? colors.brand.primary : colors.border.strong }}
        >
          {paymentMethod === 'click_online' && (
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
          )}
        </View>
      </Pressable>

      {paymentMethod === 'click_online' && (
        <View className="gap-2 pl-3 mt-1">
          {activeCards.map((card) => {
            const active = selectedCardId === card.id;
            const brand = detectCardBrand(card.cardNumberMasked ?? '');
            return (
              <Pressable
                key={card.id}
                className="flex-row items-center gap-2 py-1"
                onPress={() => {
                  haptics.selection();
                  onSelectCardId(card.id);
                }}
              >
                <View
                  className="w-5 h-5 rounded-full border-2 items-center justify-center"
                  style={{ borderColor: active ? colors.brand.primary : colors.border.strong }}
                >
                  {active && (
                    <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
                  )}
                </View>
                <CardVisual
                  size="mini"
                  brand={brand}
                  numberText={card.cardNumberMasked ?? '••••'}
                  fallbackLabel={tr('cards.genericName')}
                />
                <Text
                  className="flex-1"
                  style={[typography.bodySmall, { color: colors.text.primary }]}
                  numberOfLines={1}
                >
                  {card.label || card.cardNumberMasked || '••••'}
                </Text>
                {card.isDefault && (
                  <Text className="font-bold" style={[typography.caption, { color: colors.brand.primary }]}>
                    {tr('cards.default')}
                  </Text>
                )}
              </Pressable>
            );
          })}
          <Pressable className="flex-row items-center gap-2 py-1" onPress={() => onSelectCardId(null)}>
            <View
              className="w-5 h-5 rounded-full border-2 items-center justify-center"
              style={{ borderColor: !selectedCardId ? colors.brand.primary : colors.border.strong }}
            >
              {!selectedCardId && (
                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
              )}
            </View>
            <Text style={[typography.bodySmall, { color: colors.text.primary }]}>
              {tr('checkout.payWithRedirect')}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/add-card')}>
            <Text className="font-bold py-1" style={[typography.bodySmall, { color: colors.brand.primary }]}>
              {tr('cards.add')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
