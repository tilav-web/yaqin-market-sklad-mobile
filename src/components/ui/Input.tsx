import { LucideIcon } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import {
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, layout, radius, typography } from '@/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  rightSlot?: React.ReactNode;
  containerStyle?: ViewStyle;
  className?: string;
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
    className,
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
    <View className={`gap-1.5 ${className ?? ''}`} style={containerStyle}>
      {label && (
        <Text style={[typography.bodySmall, { color: colors.text.secondary, fontWeight: '600' }]}>
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center px-4 gap-2"
        style={{
          borderColor,
          borderWidth: focused || error ? 1.5 : 1,
          borderRadius: radius.md,
          height: size === 'lg' ? 56 : layout.inputHeight,
          backgroundColor: focused ? colors.bg.surface : colors.bg.surfaceMuted,
        }}>
        {LeftIcon && (
          <LeftIcon size={18} color={focused ? colors.brand.primary : colors.text.tertiary} strokeWidth={2} />
        )}
        <TextInput
          ref={ref}
          {...rest}
          className="flex-1 h-full p-0"
          style={[typography.body, { color: colors.text.primary }]}
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
        <Text
          className="mt-0.5 px-1"
          style={[typography.caption, { color: error ? colors.text.danger : colors.text.tertiary }]}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
});
