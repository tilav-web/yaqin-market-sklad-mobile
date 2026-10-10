export interface OrderStatusConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

export function getOrderStatusConfig(
  status: string | undefined,
  tr: (key: any) => string
): OrderStatusConfig {
  if (!status) {
    return {
      label: '',
      bg: '#F3F4F6',
      text: '#6B7280',
      border: '#E5E7EB',
    };
  }

  const s = status.toLowerCase();

  switch (s) {
    case 'delivered':
      return {
        label: tr('orders.statusDelivered') || 'Yetkazildi',
        bg: '#ECFDF5',
        text: '#059669',
        border: '#A7F3D0',
      };
    case 'delivering':
      return {
        label: tr('orders.statusDelivering') || "Yo'lda",
        bg: '#EFF6FF',
        text: '#2563EB',
        border: '#BFDBFE',
      };
    case 'preparing':
      return {
        label: tr('orders.statusPreparing') || "Yig'ilmoqda",
        bg: '#FFFBEB',
        text: '#D97706',
        border: '#FDE68A',
      };
    case 'accepted':
      return {
        label: tr('orders.statusAccepted') || 'Qabul qilindi',
        bg: '#F0FDF4',
        text: '#16A34A',
        border: '#BBF7D0',
      };
    case 'new':
      return {
        label: tr('orders.statusNew') || 'Yangi',
        bg: '#FEF2F2',
        text: '#DC2626',
        border: '#FECACA',
      };
    case 'cancelled':
      return {
        label: tr('orders.statusCancelled') || 'Bekor qilindi',
        bg: '#F3F4F6',
        text: '#6B7280',
        border: '#E5E7EB',
      };
    case 'seller_no_response':
      return {
        label: tr('orders.statusSellerNoResponse') || 'Do\'kon javob bermadi',
        bg: '#F3F4F6',
        text: '#6B7280',
        border: '#E5E7EB',
      };
    case 'seller_rejected':
      return {
        label: tr('orders.statusSellerRejected') || 'Do\'kon rad etdi',
        bg: '#FEF2F2',
        text: '#DC2626',
        border: '#FECACA',
      };
    default:
      return {
        label: status,
        bg: '#F3F4F6',
        text: '#4B5563',
        border: '#E5E7EB',
      };
  }
}
