import { Timer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useCountdown } from '@/lib/useCountdown';
import { colors, radius, spacing, typography } from '@/theme';

// Mirrors AUTO_CANCEL_MS in server/src/orders/orders.service.ts (business
// rule #5: a `new` order not accepted within 5 minutes is auto-cancelled).
// The order API doesn't return an explicit deadline/expiresAt field, so this
// is computed client-side from `createdAt`.
const AUTO_CANCEL_MS = 5 * 60 * 1000;

function fmtMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Visible countdown to the 5-minute accept-or-auto-cancel deadline for a
 * `new` order. Renders nothing once the deadline passes or the order is no
 * longer `new` — the seller either accepted it or it's about to flip to
 * `cancelled` server-side (checked every minute), so a stuck "0:00" would be
 * misleading.
 */
export function AutoCancelCountdown({
  createdAt,
  status,
}: {
  readonly createdAt: string;
  readonly status: string;
}) {
  const deadline = new Date(createdAt).getTime() + AUTO_CANCEL_MS;
  const remaining = useCountdown(deadline);
  if (status !== 'new' || remaining <= 0) return null;
  const urgent = remaining <= 60;
  return (
    <View style={[styles.wrap, urgent && styles.wrapUrgent]}>
      <Timer size={14} color={urgent ? colors.feedback.danger : colors.feedback.warning} strokeWidth={2.4} />
      <Text style={[styles.text, urgent && styles.textUrgent]}>
        Avtomatik bekor bo'lishiga: {fmtMMSS(remaining)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.warningSurface,
  },
  wrapUrgent: { backgroundColor: colors.feedback.dangerSurface },
  text: { ...typography.caption, fontWeight: '800', color: colors.feedback.warning },
  textUrgent: { color: colors.feedback.danger },
});
