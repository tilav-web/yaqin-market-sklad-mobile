import { LucideIcon } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  rightSlot?: React.ReactNode;
  containerStyle?: ViewStyle;
  size?: 'md' | 'lg';
}

export const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    hint,
    error,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    rightSlot,
    containerStyle,
    size = 'md',
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.border.danger
    : focused
      ? colors.border.focus
      : colors.border.default;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.fieldWrap,
          {
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            height: size === 'lg' ? 56 : layout.inputHeight,
            backgroundColor: focused ? colors.bg.surface : colors.bg.surfaceMuted,
          },
        ]}>
        {LeftIcon && (
          <LeftIcon size={18} color={focused ? colors.brand.primary : colors.text.tertiary} strokeWidth={2} />
        )}
        <TextInput
          ref={ref}
          {...rest}
          style={[styles.input]}
          placeholderTextColor={colors.text.hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {RightIcon && (
          <RightIcon size={18} color={colors.text.tertiary} strokeWidth={2} />
        )}
        {rightSlot}
      </View>
      {(hint || error) && (
        <Text style={[styles.hint, error && { color: colors.text.danger }]}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { ...typography.bodySmall, color: colors.text.secondary, fontWeight: '600' },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    height: '100%',
    padding: 0,
    color: colors.text.primary,
  },
  hint: { ...typography.caption, color: colors.text.tertiary, marginTop: 2, paddingHorizontal: spacing.xs },
});
