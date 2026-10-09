import { AlertCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
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
    <SafeAreaView edges={['bottom']} style={styles.footer}>
      {/* Why the button is off, stated once in a slim band */}
      {blocker && (
        <View style={[styles.blocker, blocker.danger && styles.blockerDanger]}>
          <View style={styles.blockerRow}>
            <AlertCircle
              size={14}
              color={blocker.danger ? colors.feedback.danger : colors.feedback.warning}
              strokeWidth={2.6}
            />
            <Text style={[styles.blockerText, blocker.danger && styles.blockerTextDanger]}>
              {blocker.text}
            </Text>
          </View>
          {blocker.progress != null && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${blocker.progress}%` }]} />
            </View>
          )}
        </View>
      )}
      <View style={styles.footerRow}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>{tr('cart.total')}</Text>
          <Text style={styles.footerTotalValue}>
            {total.toLocaleString()} {tr('common.som')}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            haptics.medium();
            onSubmit();
          }}
          disabled={!canOrder || isPending}
          style={[styles.orderBtn, (!canOrder || isPending) && styles.orderBtnDisabled]}
        >
          {isPending ? (
            <ActivityIndicator color={colors.text.onPrimary} />
          ) : (
            <Text style={styles.orderBtnText}>{tr('cart.proceed')}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    ...shadow.lg,
  },
  blocker: {
    backgroundColor: colors.feedback.warningSurface,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  blockerDanger: { backgroundColor: colors.feedback.dangerSurface },
  blockerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockerText: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700', flex: 1 },
  blockerTextDanger: { color: colors.feedback.danger },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.feedback.warning },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  footerTotal: {},
  footerTotalLabel: { ...typography.caption, color: colors.text.tertiary },
  footerTotalValue: { ...typography.h3, color: colors.text.primary },
  orderBtn: {
    flex: 1,
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnDisabled: { backgroundColor: colors.text.hint },
  orderBtnText: { ...typography.button, color: colors.text.onPrimary },
});
