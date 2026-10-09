import { ChevronRight, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useTheme } from '@/stores/theme';
import { colors, hitSlop, typography } from '@/theme';
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
      className="flex-row items-center gap-3 px-4 py-3"
      style={({ pressed }) => [
        {
          borderBottomWidth: borderBottom ? 1 : 0,
          borderBottomColor: activeColors.border.subtle,
        },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      <View className="w-6.5 items-center">
        <Icon size={21} color={activeColors.text.secondary} strokeWidth={1.8} />
      </View>
      <View className="flex-1">
        <Text style={[typography.bodyStrong, { color: titleColor ?? activeColors.text.primary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text className="mt-0.5" style={[typography.caption, { color: activeColors.text.secondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && <Text style={[typography.body, { color: activeColors.text.secondary }]}>{value}</Text>}
      {badge && badge > 0 ? (
        <View
          className="min-w-[24px] h-6 px-1.5 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.brand.accent }}
        >
          <Text className="text-[13px] font-extrabold" style={{ color: colors.text.onPrimary }}>
            {badge}
          </Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={activeColors.text.tertiary} strokeWidth={2.2} />
    </Pressable>
  );
}
