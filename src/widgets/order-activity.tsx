import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';
import type { SFSymbols7_0 } from 'sf-symbols-typescript';

// Lazy-import Image so it doesn't break on non-iOS at module-init time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Img: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Img = require('@expo/ui/swift-ui').Image;
} catch {
  Img = null;
}

export interface OrderActivityProps {
  orderNumber: string;
  shopName: string;
  status: 'new' | 'accepted' | 'preparing' | 'delivering' | 'delivered';
}

const STATUS_LABEL: Record<OrderActivityProps['status'], string> = {
  new: "Yangi buyurtma",
  accepted: "Qabul qilindi",
  preparing: "Tayyorlanmoqda",
  delivering: "Yetkazilmoqda",
  delivered: "Yetkazildi",
};

const STATUS_STEP: Record<OrderActivityProps['status'], number> = {
  new: 0,
  accepted: 1,
  preparing: 2,
  delivering: 3,
  delivered: 4,
};

const STATUS_ICON: Record<OrderActivityProps['status'], SFSymbols7_0> = {
  new: 'clock.fill' as SFSymbols7_0,
  accepted: 'checkmark.circle.fill' as SFSymbols7_0,
  preparing: 'bag.fill' as SFSymbols7_0,
  delivering: 'bicycle' as SFSymbols7_0,
  delivered: 'house.fill' as SFSymbols7_0,
};

const GREEN = '#22C55E';
const GRAY = '#9CA3AF';

const OrderActivity = (props: OrderActivityProps) => {
  'widget';

  const step = STATUS_STEP[props.status];
  const icon = STATUS_ICON[props.status];

  return {
    banner: (
      <HStack spacing={10} modifiers={[padding({ all: 12 })]}>
        {Img && (
          <Img
            systemName={icon}
            modifiers={[frame({ width: 28, height: 28 }), foregroundStyle(GREEN)]}
          />
        )}
        <VStack spacing={2}>
          <Text modifiers={[font({ weight: 'semibold', size: 14 })]}>{`#${props.orderNumber}`}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(GRAY)]}>{props.shopName}</Text>
        </VStack>
        <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(GREEN)]}>
          {STATUS_LABEL[props.status]}
        </Text>
      </HStack>
    ),

    compactLeading: Img ? (
      <Img
        systemName={icon}
        modifiers={[frame({ width: 16, height: 16 }), foregroundStyle(GREEN)]}
      />
    ) : (
      <Text>{''}</Text>
    ),

    compactTrailing: (
      <Text modifiers={[font({ size: 11, weight: 'semibold' })]}>{`${step + 1}/5`}</Text>
    ),

    expandedLeading: (
      <VStack spacing={4} modifiers={[padding({ all: 8 })]}>
        {Img && (
          <Img
            systemName={icon}
            modifiers={[frame({ width: 24, height: 24 }), foregroundStyle(GREEN)]}
          />
        )}
        <Text modifiers={[font({ size: 10 })]}>{`#${props.orderNumber}`}</Text>
      </VStack>
    ),

    expandedTrailing: (
      <VStack spacing={2} modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 13 })]}>{STATUS_LABEL[props.status]}</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(GRAY)]}>{props.shopName}</Text>
      </VStack>
    ),

    expandedBottom: (
      <HStack spacing={0} modifiers={[padding({ all: 12 })]}>
        {(['new', 'accepted', 'preparing', 'delivering', 'delivered'] as const).map((s, i) => (
          <VStack key={s} spacing={4}>
            {Img && (
              <Img
                systemName={STATUS_ICON[s]}
                modifiers={[
                  frame({ width: 14, height: 14 }),
                  foregroundStyle(i <= step ? GREEN : GRAY),
                ]}
              />
            )}
            <Text modifiers={[font({ size: 9 }), foregroundStyle(i <= step ? GREEN : GRAY)]}>
              {STATUS_LABEL[s].split(' ')[0]}
            </Text>
          </VStack>
        ))}
      </HStack>
    ),
  };
};

export default createLiveActivity('OrderActivity', OrderActivity);
