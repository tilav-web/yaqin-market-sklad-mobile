import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { fmt } from './types';

interface SellerOrderTotalsCardProps {
  order: Order;
}

export function SellerOrderTotalsCard({ order }: SellerOrderTotalsCardProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.card}>
      <TotalsRow label={tr('cart.subtotal')} value={order.subTotal} />
      {order.deliveryFee > 0 ? (
        <TotalsRow label={tr('cart.deliveryFee')} value={order.deliveryFee} />
      ) : null}
      <View style={styles.divider} />
      <TotalsRow label={tr('cart.total')} value={order.total} bold />
    </View>
  );
}

function TotalsRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const { tr } = useTranslation();

  return (
    <View style={styles.totalsRow}>
      <Text style={[styles.totalsLabel, bold && styles.totalsBold]}>{label}</Text>
      <Text style={[styles.totalsValue, bold && styles.totalsBold]}>
        {fmt(value)} {tr('common.som')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.sm,
  },
  divider: { height: 1, backgroundColor: colors.border.subtle },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalsLabel: { ...typography.bodySmall, color: colors.text.secondary },
  totalsValue: { ...typography.bodySmall, color: colors.text.primary },
  totalsBold: { ...typography.bodyStrong, color: colors.brand.primary },
});
