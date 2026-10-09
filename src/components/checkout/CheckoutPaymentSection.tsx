import { router } from 'expo-router';
import { CreditCard, Wallet } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CardVisual } from '@/components/CardVisual';
import { useTranslation } from '@/i18n';
import { SavedCard } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
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
    <View style={styles.section}>
      <Pressable
        style={[styles.payRow, paymentMethod === 'cash' && styles.payRowActive]}
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
        <Text style={[styles.payText, paymentMethod === 'cash' && styles.payTextActive]}>
          {tr('checkout.cash')}
        </Text>
        <View style={[styles.radio, paymentMethod === 'cash' && styles.radioActive]}>
          {paymentMethod === 'cash' && <View style={styles.radioDot} />}
        </View>
      </Pressable>
      <Pressable
        style={[styles.payRow, paymentMethod === 'click_online' && styles.payRowActive]}
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
        <Text style={[styles.payText, paymentMethod === 'click_online' && styles.payTextActive]}>
          {tr('checkout.cardPayment')}
        </Text>
        <View style={[styles.radio, paymentMethod === 'click_online' && styles.radioActive]}>
          {paymentMethod === 'click_online' && <View style={styles.radioDot} />}
        </View>
      </Pressable>

      {paymentMethod === 'click_online' && (
        <View style={styles.cardSubList}>
          {activeCards.map((card) => {
            const active = selectedCardId === card.id;
            const brand = detectCardBrand(card.cardNumberMasked ?? '');
            return (
              <Pressable
                key={card.id}
                style={styles.cardSubRow}
                onPress={() => {
                  haptics.selection();
                  onSelectCardId(card.id);
                }}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
                <CardVisual
                  size="mini"
                  brand={brand}
                  numberText={card.cardNumberMasked ?? '••••'}
                  fallbackLabel={tr('cards.genericName')}
                />
                <Text style={styles.cardSubText} numberOfLines={1}>
                  {card.label || card.cardNumberMasked || '••••'}
                </Text>
                {card.isDefault && <Text style={styles.cardSubDefault}>{tr('cards.default')}</Text>}
              </Pressable>
            );
          })}
          <Pressable style={styles.cardSubRow} onPress={() => onSelectCardId(null)}>
            <View style={[styles.radio, !selectedCardId && styles.radioActive]}>
              {!selectedCardId && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.cardSubText}>{tr('checkout.payWithRedirect')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/add-card')}>
            <Text style={styles.addCardLink}>{tr('cards.add')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    marginBottom: spacing.sm,
  },
  payRowActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  payText: { ...typography.body, fontWeight: '600', flex: 1 },
  payTextActive: { color: colors.brand.primary },
  cardSubList: { gap: spacing.sm, paddingLeft: spacing.md, marginTop: spacing.xs },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.brand.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand.primary },
  cardSubText: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  cardSubDefault: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  addCardLink: { ...typography.bodySmall, color: colors.brand.primary, fontWeight: '700', paddingVertical: spacing.xs },
});
