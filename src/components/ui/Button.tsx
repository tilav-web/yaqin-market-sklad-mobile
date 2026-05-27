import { LucideIcon } from 'lucide-react-native';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';
  style?: ViewStyle | ViewStyle[];
}

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  haptic = 'light',
  style,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic !== 'none') haptics[haptic]();
    onPress();
  };

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, friction: 7, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start();
  };

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const textColor = isDisabled && variant !== 'ghost' && variant !== 'outline'
    ? colors.text.onPrimary
    : variantStyle.textColor;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && { alignSelf: 'stretch' },
      ]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor: variantStyle.bg,
            borderColor: variantStyle.border,
            borderWidth: variantStyle.borderWidth,
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingX,
            opacity: isDisabled ? 0.4 : 1,
          },
          variant === 'primary' || variant === 'accent' ? shadow.sm : shadow.none,
          pressed && !isDisabled && { opacity: 0.95 },
          style,
        ]}
        {...rest}>
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <View style={styles.inner}>
            {LeftIcon && <LeftIcon size={ICON_SIZE[size]} color={textColor} strokeWidth={2.4} />}
            <Text
              style={[
                size === 'sm' ? typography.buttonSmall : typography.button,
                { color: textColor },
              ]}>
              {label}
            </Text>
            {RightIcon && <RightIcon size={ICON_SIZE[size]} color={textColor} strokeWidth={2.4} />}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { bg: string; textColor: string; border: string; borderWidth: number }
> = {
  primary: {
    bg: colors.brand.primary,
    textColor: colors.text.onPrimary,
    border: 'transparent',
    borderWidth: 0,
  },
  accent: {
    bg: colors.brand.accent,
    textColor: colors.text.onAccent,
    border: 'transparent',
    borderWidth: 0,
  },
  secondary: {
    bg: colors.brand.primarySurface,
    textColor: colors.brand.primary,
    border: 'transparent',
    borderWidth: 0,
  },
  outline: {
    bg: 'transparent',
    textColor: colors.brand.primary,
    border: colors.brand.primary,
    borderWidth: 1.5,
  },
  ghost: {
    bg: 'transparent',
    textColor: colors.brand.primary,
    border: 'transparent',
    borderWidth: 0,
  },
  danger: {
    bg: colors.brand.accent,
    textColor: colors.text.onAccent,
    border: 'transparent',
    borderWidth: 0,
  },
};

const SIZE_STYLES: Record<ButtonSize, { height: number; paddingX: number }> = {
  sm: { height: layout.buttonHeight.sm, paddingX: spacing.md },
  md: { height: layout.buttonHeight.md, paddingX: spacing.xl },
  lg: { height: layout.buttonHeight.lg, paddingX: spacing['2xl'] },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
