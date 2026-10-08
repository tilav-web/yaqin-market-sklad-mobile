import { Pressable, PressableProps, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadow as shadowTokens, spacing } from '@/theme';
import { useTheme } from '@/stores/theme';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  padding?: keyof typeof spacing | 'none';
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  bordered?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function Card({
  children,
  padding = 'lg',
  elevation = 'xs',
  bordered = true,
  style,
  onPress,
  ...rest
}: Props) {
  const { colors: activeColors } = useTheme();
  const content = (
    <View
      style={[
        styles.base,
        { backgroundColor: activeColors.bg.surface },
        bordered && { borderWidth: 1, borderColor: activeColors.border.subtle },
        shadowTokens[elevation],
        padding !== 'none' && { padding: spacing[padding] },
        style,
      ]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} {...rest} android_ripple={{ color: activeColors.border.subtle }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
  },
});
