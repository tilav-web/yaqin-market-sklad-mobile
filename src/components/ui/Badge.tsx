import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type BadgeTone =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface Props {
  label: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  primary: { bg: colors.brand.primarySurface, fg: colors.brand.primary },
  accent: { bg: colors.brand.accentSurface, fg: colors.brand.accent },
  success: { bg: colors.feedback.successSurface, fg: colors.feedback.success },
  warning: { bg: colors.feedback.warningSurface, fg: '#A57A00' },
  danger: { bg: colors.feedback.dangerSurface, fg: colors.feedback.danger },
  info: { bg: colors.feedback.infoSurface, fg: colors.feedback.info },
  neutral: { bg: colors.bg.surfaceMuted, fg: colors.text.secondary },
};

export function Badge({ label, tone = 'neutral', size = 'sm', style }: Props) {
  const t = TONE_STYLES[tone];
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: t.bg,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
          paddingVertical: size === 'sm' ? 3 : 5,
        },
        style,
      ]}>
      <Text
        style={[
          styles.text,
          { color: t.fg, fontSize: size === 'sm' ? 11 : 13 },
        ]}>
        {label}
      </Text>
    </View>
  );
}

export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  new: 'warning',
  accepted: 'info',
  preparing: 'primary',
  delivering: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

const STATUS_LABELS_UZ: Record<OrderStatus, string> = {
  new: 'Yangi',
  accepted: 'Qabul qilindi',
  preparing: "Yig'ilmoqda",
  delivering: 'Yo\'lda',
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge label={STATUS_LABELS_UZ[status]} tone={STATUS_TONE[status]} size="md" />;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
