import { FileText } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface OrderSummaryCardProps {
  order: Pick<Order, 'subTotal' | 'deliveryFee' | 'distanceKm' | 'total' | 'paymentStatus' | 'status'>;
  hasReturns: boolean;
  returnedTotal: number;
  onOpenReceipt: () => void;
}

function SummaryRow({
  label,
  value,
  bold,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly bold?: boolean;
  readonly tone?: 'warning';
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.rowValueBold,
          tone === 'warning' && { color: colors.feedback.warning, fontWeight: '700' },
        ]}>
        {value}
      </Text>
    </View>
  );
}

export function OrderSummaryCard({
  order,
  hasReturns,
  returnedTotal,
  onOpenReceipt,
}: OrderSummaryCardProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.section}>
      {hasReturns && (
        <>
          <SummaryRow
            label={tr('orderDet.returnedLabel')}
            value={`− ${returnedTotal.toLocaleString()} ${tr('common.som')}`}
            tone="warning"
          />
          <View style={styles.divider} />
        </>
      )}
      <SummaryRow label={tr('cart.subtotal')} value={`${order.subTotal.toLocaleString()} ${tr('common.som')}`} />
      <SummaryRow label={tr('cart.deliveryFee')} value={`${order.deliveryFee.toLocaleString()} ${tr('common.som')}`} />
      <SummaryRow label={tr('cart.distance')} value={`${order.distanceKm.toFixed(2)} km`} />
      <View style={styles.divider} />
      <SummaryRow
        label={hasReturns ? tr('orderDet.newTotalAfterReturn') : tr('cart.total')}
        value={`${order.total.toLocaleString()} ${tr('common.som')}`}
        bold
      />
      {(order.paymentStatus === 'paid' || order.status === 'delivered') && (
        <>
          <View style={styles.divider} />
          <Pressable
            style={styles.fiscalReceiptBtn}
            onPress={() => {
              haptics.selection();
              onOpenReceipt();
            }}>
            <View style={styles.fiscalReceiptBtnLeft}>
              <FileText size={18} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={styles.fiscalReceiptBtnText}>{tr('fiscal.viewReceiptBtn')}</Text>
            </View>
            <View style={styles.fiscalReceiptBtnTagWrap}>
              <Text style={styles.fiscalReceiptBtnTag}>1% keshbek</Text>
            </View>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border.subtle },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...typography.bodySmall, color: colors.text.secondary },
  rowLabelBold: { ...typography.bodyStrong, color: colors.text.primary },
  rowValue: { ...typography.bodySmall, color: colors.text.primary },
  rowValueBold: { ...typography.bodyStrong, fontSize: 16 },
  fiscalReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  fiscalReceiptBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fiscalReceiptBtnText: { ...typography.bodyStrong, color: colors.brand.primary },
  fiscalReceiptBtnTagWrap: {
    backgroundColor: colors.feedback.successSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.feedback.success,
  },
  fiscalReceiptBtnTag: { ...typography.caption, fontSize: 11, fontWeight: '800', color: colors.feedback.success },
});
