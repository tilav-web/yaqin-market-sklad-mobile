import { MapPin, Phone } from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Order } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';

interface SellerOrderCustomerCardProps {
  order: Order;
}

export function SellerOrderCustomerCard({ order }: SellerOrderCustomerCardProps) {
  const { tr } = useTranslation();

  if (!order.user && !order.deliveryAddress) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{tr('sellerOrder.customer')}</Text>
      {order.user?.phone ? (
        <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${order.user?.phone}`)}>
          <Phone size={15} color={colors.brand.primary} strokeWidth={2.2} />
          <Text style={styles.infoLink}>
            {order.user?.name ?? tr('sellerOrder.customer')} · {order.user?.phone}
          </Text>
        </Pressable>
      ) : null}
      {order.deliveryAddress?.address ? (
        <View style={styles.infoRow}>
          <MapPin size={15} color={colors.text.secondary} strokeWidth={2.2} />
          <Text style={styles.infoText}>{order.deliveryAddress.address}</Text>
        </View>
      ) : null}
      {order.deliveryAddress &&
      (order.deliveryAddress.entrance ||
        order.deliveryAddress.floor ||
        order.deliveryAddress.apartment ||
        order.deliveryAddress.intercom) ? (
        <Text style={styles.infoText}>
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
        <Pressable style={styles.infoRow} onPress={() => Linking.openURL(`tel:${order.recipientPhone}`)}>
          <Phone size={15} color={colors.brand.primary} strokeWidth={2.2} />
          <Text style={styles.infoLink}>{tr('sellerOrder.recipient', { phone: order.recipientPhone })}</Text>
        </Pressable>
      ) : null}
      {order.courierComment ? (
        <Text style={styles.infoText}>{tr('sellerOrder.courierComment', { text: order.courierComment })}</Text>
      ) : null}
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
  cardTitle: { ...typography.overline, color: colors.text.secondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLink: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary, flex: 1 },
  infoText: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
});
