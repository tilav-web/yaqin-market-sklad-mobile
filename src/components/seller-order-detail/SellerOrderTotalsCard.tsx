import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { fmt } from './types';

interface SellerOrderTotalsCardProps {
  order: Order;
}

export function SellerOrderTotalsCard({ order }: SellerOrderTotalsCardProps) {
  const { tr } = useTranslation();

  return (
    <View className="bg-bg-surface rounded-2xl p-4 border border-border-subtle gap-2">
      <TotalsRow label={tr('cart.subtotal')} value={order.subTotal} />
      {order.deliveryFee > 0 ? (
        <TotalsRow label={tr('cart.deliveryFee')} value={order.deliveryFee} />
      ) : null}
      <View className="h-px bg-border-subtle" />
      <TotalsRow label={tr('cart.total')} value={order.total} bold />
    </View>
  );
}

function TotalsRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const { tr } = useTranslation();

  return (
    <View className="flex-row justify-between items-center">
      <Text className={`text-sm ${bold ? 'font-bold text-brand-primary' : 'text-text-secondary'}`}>
        {label}
      </Text>
      <Text className={`text-sm ${bold ? 'font-bold text-brand-primary' : 'text-text-primary'}`}>
        {fmt(value)} {tr('common.som')}
      </Text>
    </View>
  );
}
