import { Check } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ORDER_STATUS_KEY, OrderStatus } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { typography } from '@/theme';

const FLOW: OrderStatus[] = ['new', 'accepted', 'preparing', 'delivering', 'delivered'];

interface OrderStatusTimelineProps {
  timeline: { status: OrderStatus; at: string }[];
}

export function OrderStatusTimeline({ timeline }: OrderStatusTimelineProps) {
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
      <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
        {tr('orderDet.timeline')}
      </Text>
      {FLOW.map((s, idx) => {
        const event = timeline.find((e) => e.status === s);
        const active = event !== undefined;
        const isLast = idx === FLOW.length - 1;
        return (
          <View key={s} className="flex-row gap-3">
            <View className="items-center w-5.5">
              <View
                className="w-5.5 h-5.5 rounded-full items-center justify-center"
                style={{
                  backgroundColor: active ? colors.feedback.success : colors.border.default,
                }}
              >
                {active && <Check size={11} color={colors.text.onPrimary} strokeWidth={3.5} />}
              </View>
              {!isLast && (
                <View
                  className="w-0.5 flex-1 my-0.5"
                  style={{
                    backgroundColor: active ? colors.feedback.success : colors.border.default,
                  }}
                />
              )}
            </View>
            <View className="flex-1 pb-3">
              <Text
                className="font-bold"
                style={[
                  typography.bodyStrong,
                  { color: active ? colors.text.primary : colors.text.secondary },
                ]}
              >
                {tr(ORDER_STATUS_KEY[s])}
              </Text>
              {event && (
                <Text className="mt-0.5" style={[typography.caption, { color: colors.text.tertiary }]}>
                  {new Date(event.at).toLocaleString('uz-UZ', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
