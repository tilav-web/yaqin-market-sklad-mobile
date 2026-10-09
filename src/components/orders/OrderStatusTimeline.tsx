import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { ORDER_STATUS_KEY, OrderStatus } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';

const FLOW: OrderStatus[] = ['new', 'accepted', 'preparing', 'delivering', 'delivered'];

interface OrderStatusTimelineProps {
  timeline: { status: OrderStatus; at: string }[];
}

export function OrderStatusTimeline({ timeline }: OrderStatusTimelineProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{tr('orderDet.timeline')}</Text>
      {FLOW.map((s, idx) => {
        const event = timeline.find((e) => e.status === s);
        const active = event !== undefined;
        const isLast = idx === FLOW.length - 1;
        return (
          <View key={s} style={styles.tlRow}>
            <View style={styles.tlGutter}>
              <View style={[styles.tlDot, active && styles.tlDotActive]}>
                {active && <Check size={11} color={colors.text.onPrimary} strokeWidth={3.5} />}
              </View>
              {!isLast && <View style={[styles.tlLine, active && styles.tlLineActive]} />}
            </View>
            <View style={styles.tlBody}>
              <Text style={[styles.tlLabel, active && styles.tlLabelActive]}>
                {tr(ORDER_STATUS_KEY[s])}
              </Text>
              {event && (
                <Text style={styles.tlTime}>
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

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
  },
  sectionTitle: { ...typography.h3, fontSize: 16 },
  tlRow: { flexDirection: 'row', gap: spacing.md },
  tlGutter: { alignItems: 'center', width: 22 },
  tlDot: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotActive: { backgroundColor: colors.feedback.success },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.border.default, marginVertical: 2 },
  tlLineActive: { backgroundColor: colors.feedback.success },
  tlBody: { flex: 1, paddingBottom: spacing.md },
  tlLabel: { ...typography.bodyStrong, color: colors.text.secondary },
  tlLabelActive: { color: colors.text.primary },
  tlTime: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
});
