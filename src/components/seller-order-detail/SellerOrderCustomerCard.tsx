import { MapPin, Phone } from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { colors } from '@/theme';

interface SellerOrderCustomerCardProps {
  order: Order;
}

export function SellerOrderCustomerCard({ order }: SellerOrderCustomerCardProps) {
  const { tr } = useTranslation();

  if (!order.user && !order.deliveryAddress) return null;

  return (
    <View className="bg-bg-surface rounded-2xl p-4 border border-border-subtle gap-2">
      <Text className="text-xs uppercase tracking-wider font-bold text-text-secondary">{tr('sellerOrder.customer')}</Text>
      {order.user?.phone ? (
        <Pressable
          className="flex-row items-center gap-2 active:opacity-75"
          onPress={() => Linking.openURL(`tel:${order.user?.phone}`)}
        >
          <Phone size={15} color={colors.brand.primary} strokeWidth={2.2} />
          <Text className="text-sm font-bold text-brand-primary flex-1">
            {order.user?.name ?? tr('sellerOrder.customer')} · {order.user?.phone}
          </Text>
        </Pressable>
      ) : null}
      {order.deliveryAddress?.address ? (
        <View className="flex-row items-center gap-2">
          <MapPin size={15} color={colors.text.secondary} strokeWidth={2.2} />
          <Text className="text-sm text-text-primary flex-1">{order.deliveryAddress.address}</Text>
        </View>
      ) : null}
      {order.deliveryAddress &&
      (order.deliveryAddress.entrance ||
        order.deliveryAddress.floor ||
        order.deliveryAddress.apartment ||
        order.deliveryAddress.intercom) ? (
        <Text className="text-sm text-text-primary">
          {[
            order.deliveryAddress.entrance && tr('sellerOrder.entrance', { n: order.deliveryAddress.entrance }),
            order.deliveryAddress.floor && tr('sellerOrder.floor', { n: order.deliveryAddress.floor }),
            order.deliveryAddress.apartment && tr('sellerOrder.apartment', { n: order.deliveryAddress.apartment }),
            order.deliveryAddress.intercom && tr('sellerOrder.intercom', { n: order.deliveryAddress.intercom }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      {order.recipientPhone && order.recipientPhone !== order.user?.phone ? (
        <Pressable
          className="flex-row items-center gap-2 active:opacity-75"
          onPress={() => Linking.openURL(`tel:${order.recipientPhone}`)}
        >
          <Phone size={15} color={colors.brand.primary} strokeWidth={2.2} />
          <Text className="text-sm font-bold text-brand-primary flex-1">
            {tr('sellerOrder.recipient', { phone: order.recipientPhone })}
          </Text>
        </Pressable>
      ) : null}
      {order.courierComment ? (
        <Text className="text-sm text-text-primary">{tr('sellerOrder.courierComment', { text: order.courierComment })}</Text>
      ) : null}
    </View>
  );
}
