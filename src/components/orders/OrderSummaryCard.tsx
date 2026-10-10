import { FileText } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { typography } from '@/theme';
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
  colors,
}: {
  readonly label: string;
  readonly value: string;
  readonly bold?: boolean;
  readonly tone?: 'warning';
  readonly colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View className="flex-row justify-between items-center">
      <Text
        style={[
          bold ? typography.bodyStrong : typography.bodySmall,
          { color: bold ? colors.text.primary : colors.text.secondary },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          bold ? typography.bodyStrong : typography.bodySmall,
          {
            color: tone === 'warning' ? colors.feedback.warning : colors.text.primary,
            fontWeight: bold || tone === 'warning' ? '700' : '400',
            fontSize: bold ? 16 : undefined,
          },
        ]}
      >
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
  const { colors } = useTheme();

  return (
    <View
      className="p-4 rounded-2xl border gap-3"
      style={{
        backgroundColor: colors.bg.surface,
        borderColor: colors.border.subtle,
      }}
    >
      {hasReturns && (
        <>
          <SummaryRow
            label={tr('orderDet.returnedLabel')}
            value={`− ${returnedTotal.toLocaleString()} ${tr('common.som')}`}
            tone="warning"
            colors={colors}
          />
          <View className="h-px" style={{ backgroundColor: colors.border.subtle }} />
        </>
      )}
      <SummaryRow label={tr('cart.subtotal')} value={`${order.subTotal.toLocaleString()} ${tr('common.som')}`} colors={colors} />
      <SummaryRow label={tr('cart.deliveryFee')} value={`${order.deliveryFee.toLocaleString()} ${tr('common.som')}`} colors={colors} />
      <SummaryRow label={tr('cart.distance')} value={`${order.distanceKm.toFixed(2)} km`} colors={colors} />
      <View className="h-px" style={{ backgroundColor: colors.border.subtle }} />
      <SummaryRow
        label={hasReturns ? tr('orderDet.newTotalAfterReturn') : tr('cart.total')}
        value={`${order.total.toLocaleString()} ${tr('common.som')}`}
        bold
        colors={colors}
      />
      {(order.paymentStatus === 'paid' || order.status === 'delivered') && (
        <>
          <View className="h-px" style={{ backgroundColor: colors.border.subtle }} />
          <Pressable
            className="flex-row items-center justify-between py-2 px-3 rounded-xl border"
            style={{
              backgroundColor: colors.brand.primarySurface,
              borderColor: colors.brand.primaryBorder,
            }}
            onPress={() => {
              haptics.selection();
              onOpenReceipt();
            }}>
            <View className="flex-row items-center gap-2">
              <FileText size={18} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={[typography.bodyStrong, { color: colors.brand.primary }]}>
                {tr('fiscal.viewReceiptBtn')}
              </Text>
            </View>
            <View
              className="px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: colors.feedback.successSurface,
                borderColor: colors.feedback.success,
              }}
            >
              <Text className="text-[11px] font-extrabold" style={{ color: colors.feedback.success }}>
                1% keshbek
              </Text>
            </View>
          </Pressable>
        </>
      )}
    </View>
  );
}
