import { OrderStatus } from '@/lib/types';
import { TranslationKey } from '@/i18n';

export const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: TranslationKey }>> = {
  new: { next: 'accepted', label: 'sellerOrder.actionAccept' },
  accepted: { next: 'preparing', label: 'sellerOrder.actionStartPicking' },
  preparing: { next: 'delivering', label: 'sellerOrder.actionHandToCourier' },
  delivering: { next: 'delivered', label: 'sellerOrder.actionDelivered' },
};

export function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}
