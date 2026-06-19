import { HStack, Image, Text, VStack } from '@expo/ui/swift-ui';
import { createLiveActivity } from 'expo-widgets';

export interface OrderActivityProps {
  orderNumber: string;
  shopName: string;
  status: 'new' | 'accepted' | 'preparing' | 'delivering' | 'delivered';
}

const STATUS_LABEL: Record<OrderActivityProps['status'], string> = {
  new: 'Yangi buyurtma',
  accepted: 'Qabul qilindi',
  preparing: 'Tayyorlanmoqda',
  delivering: 'Yetkazilmoqda',
  delivered: 'Yetkazildi',
};

// Step index for progress display (0-4)
const STATUS_STEP: Record<OrderActivityProps['status'], number> = {
  new: 0,
  accepted: 1,
  preparing: 2,
  delivering: 3,
  delivered: 4,
};

const STATUS_ICON: Record<OrderActivityProps['status'], string> = {
  new: 'clock.fill',
  accepted: 'checkmark.circle.fill',
  preparing: 'bag.fill',
  delivering: 'bicycle',
  delivered: 'house.fill',
};

const OrderActivity = (props: OrderActivityProps) => {
  'widget';

  const step = STATUS_STEP[props.status];
  const icon = STATUS_ICON[props.status];

  return {
    // Lock screen / banner (shown when notification arrives)
    banner: (
      <HStack style={{ padding: 12, gap: 10 }}>
        <Image systemName={icon} style={{ width: 28, height: 28, tintColor: '#22C55E' }} />
        <VStack style={{ gap: 2 }}>
          <Text style={{ fontWeight: '600', fontSize: 14 }}>#{props.orderNumber}</Text>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>{props.shopName}</Text>
        </VStack>
        <Text style={{ marginLeft: 'auto', fontWeight: '600', fontSize: 13, color: '#22C55E' }}>
          {STATUS_LABEL[props.status]}
        </Text>
      </HStack>
    ),

    // Dynamic Island — compact left
    compactLeading: (
      <Image systemName={icon} style={{ width: 16, height: 16, tintColor: '#22C55E' }} />
    ),

    // Dynamic Island — compact right
    compactTrailing: (
      <Text style={{ fontSize: 11, fontWeight: '600' }}>
        {step + 1}/5
      </Text>
    ),

    // Dynamic Island — expanded (long press)
    expandedLeading: (
      <VStack style={{ gap: 4, padding: 8 }}>
        <Image systemName={icon} style={{ width: 24, height: 24, tintColor: '#22C55E' }} />
        <Text style={{ fontSize: 10 }}>#{props.orderNumber}</Text>
      </VStack>
    ),

    expandedTrailing: (
      <VStack style={{ gap: 2, padding: 8 }}>
        <Text style={{ fontWeight: '700', fontSize: 13 }}>{STATUS_LABEL[props.status]}</Text>
        <Text style={{ fontSize: 11, color: '#6B7280' }}>{props.shopName}</Text>
      </VStack>
    ),

    expandedBottom: (
      <HStack style={{ padding: 12, gap: 0 }}>
        {(['new', 'accepted', 'preparing', 'delivering', 'delivered'] as const).map((s, i) => (
          <VStack key={s} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Image
              systemName={STATUS_ICON[s]}
              style={{
                width: 14,
                height: 14,
                tintColor: i <= step ? '#22C55E' : '#9CA3AF',
              }}
            />
            <Text style={{ fontSize: 9, color: i <= step ? '#22C55E' : '#9CA3AF' }}>
              {STATUS_LABEL[s].split(' ')[0]}
            </Text>
          </VStack>
        ))}
      </HStack>
    ),
  };
};

export default createLiveActivity('OrderActivity', OrderActivity);
