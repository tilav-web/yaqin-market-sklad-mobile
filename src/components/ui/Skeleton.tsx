import { useEffect, useState } from 'react';
import { Animated, ViewStyle } from 'react-native';

import { useTheme } from '@/stores/theme';
import { radius as radiusToken } from '@/theme';

interface Props {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  style?: ViewStyle;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = radiusToken.sm,
  style,
  className,
}: Props) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.bg.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}
