import { AlertCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { colors, shadow, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export interface CheckoutBlocker {
  text: string;
  danger: boolean;
  progress: number | null;
}

interface CheckoutFooterProps {
  blocker: CheckoutBlocker | null;
  total: number;
  canOrder: boolean;
  isPending: boolean;
  onSubmit: () => void;
}

export function CheckoutFooter({
  blocker,
  total,
  canOrder,
  isPending,
  onSubmit,
}: CheckoutFooterProps) {
  const { tr } = useTranslation();

  return (
    <SafeAreaView
      edges={['bottom']}
      className="border-t"
      style={[{ backgroundColor: colors.bg.surface, borderTopColor: colors.border.subtle }, shadow.lg]}
    >
      {/* Why the button is off, stated once in a slim band */}
      {blocker && (
        <View
          className="px-4 py-2 gap-1.5"
          style={{
            backgroundColor: blocker.danger
              ? colors.feedback.dangerSurface
              : colors.feedback.warningSurface,
          }}
        >
          <View className="flex-row items-center gap-1.5">
            <AlertCircle
              size={14}
              color={blocker.danger ? colors.feedback.danger : colors.feedback.warning}
              strokeWidth={2.6}
            />
            <Text
              className="flex-1 font-bold"
              style={[
                typography.caption,
                { color: blocker.danger ? colors.feedback.danger : colors.feedback.warning },
              ]}
            >
              {blocker.text}
            </Text>
          </View>
          {blocker.progress != null && (
            <View className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.surface }}>
              <View
                className="h-full rounded-full"
                style={{ width: `${blocker.progress}%`, backgroundColor: colors.feedback.warning }}
              />
            </View>
          )}
        </View>
      )}
      <View className="flex-row items-center gap-3 px-4 pt-3 pb-2">
        <View>
          <Text style={[typography.caption, { color: colors.text.tertiary }]}>{tr('cart.total')}</Text>
          <Text style={[typography.h3, { color: colors.text.primary }]}>
            {total.toLocaleString()} {tr('common.som')}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            haptics.medium();
            onSubmit();
          }}
          disabled={!canOrder || isPending}
          className="flex-1 h-12 rounded-xl items-center justify-center"
          style={{
            backgroundColor: !canOrder || isPending ? colors.text.hint : colors.brand.primary,
          }}
        >
          {isPending ? (
            <ActivityIndicator color={colors.text.onPrimary} />
          ) : (
            <Text style={[typography.button, { color: colors.text.onPrimary }]}>
              {tr('cart.proceed')}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
