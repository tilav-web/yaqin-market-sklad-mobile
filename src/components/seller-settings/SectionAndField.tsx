import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { colors, typography } from '@/theme';

interface SectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <View
      className="p-4 rounded-3xl border gap-3"
      style={{
        backgroundColor: colors.bg.surface,
        borderColor: colors.border.subtle,
      }}
    >
      <View className="flex-row items-center gap-2">
        <Icon size={16} color={colors.brand.primary} strokeWidth={2.4} />
        <Text style={[typography.h4, { color: colors.text.primary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  flex?: boolean;
}

export function Field({ label, children, flex }: FieldProps) {
  return (
    <View className={`gap-1 ${flex ? 'flex-1' : ''}`}>
      <Text className="font-bold text-xs" style={{ color: colors.text.secondary }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
