import { Linking } from 'react-native';

import { TranslationKey } from '@/i18n';
import { Order, OrderStatus } from '@/lib/types';

export function openDirections(lat: number, lng: number) {
  Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}&dirflg=d`).catch(() => {});
}

export const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; labelKey: TranslationKey }>> = {
  new: { next: 'accepted', labelKey: 'sellerOrders.accept' },
  accepted: { next: 'preparing', labelKey: 'sellerOrders.startPicking' },
  preparing: { next: 'delivering', labelKey: 'sellerOrders.handToCourier' },
  delivering: { next: 'delivered', labelKey: 'sellerOrders.markDelivered' },
};

export type Filter = 'new' | 'progress' | 'done';

export const FILTERS: { key: Filter; labelKey: TranslationKey }[] = [
  { key: 'new', labelKey: 'sellerOrders.filterNew' },
  { key: 'progress', labelKey: 'sellerOrders.filterProgress' },
  { key: 'done', labelKey: 'sellerOrders.filterDone' },
];

export const NO_ORDERS: Order[] = [];
export const PROGRESS: OrderStatus[] = ['accepted', 'preparing', 'delivering'];
export const DONE: OrderStatus[] = ['delivered', 'cancelled', 'seller_no_response', 'seller_rejected'];

export function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}
