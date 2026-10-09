import { ChevronRight, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/stores/theme';
import { colors, hitSlop, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface ProfileMenuSectionProps {
  children: React.ReactNode;
}

export function ProfileMenuSection({ children }: ProfileMenuSectionProps) {
  return (
    <Card padding="none" elevation="xs">
      {children}
    </Card>
  );
}

interface ProfileMenuRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  titleColor?: string;
  value?: string;
  badge?: number;
  borderBottom?: boolean;
  onPress: () => void;
}

export function ProfileMenuRow({
  icon: Icon,
  title,
  subtitle,
  titleColor,
  value,
  badge,
  borderBottom = true,
  onPress,
}: ProfileMenuRowProps) {
  const { colors: activeColors } = useTheme();

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomWidth: borderBottom ? 1 : 0,
          borderBottomColor: activeColors.border.subtle,
        },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      <View style={styles.rowIconWrap}>
        <Icon size={21} color={activeColors.text.secondary} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: activeColors.text.primary }, titleColor && { color: titleColor }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.rowSub, { color: activeColors.text.secondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && <Text style={[styles.rowValue, { color: activeColors.text.secondary }]}>{value}</Text>}
      {badge && badge > 0 ? (
        <View style={styles.rowBadge}>
          <Text style={styles.rowBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={activeColors.text.tertiary} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowIconWrap: { width: 26, alignItems: 'center' },
  rowTitle: { ...typography.bodyStrong },
  rowSub: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  rowValue: { ...typography.body, color: colors.text.tertiary },
  rowBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: radius.full,
    backgroundColor: colors.brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: { color: colors.text.onPrimary, fontSize: 13, fontWeight: '800' },
});
