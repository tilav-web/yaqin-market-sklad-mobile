import { Star } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { colors } from '@/theme';

interface StarsProps {
  value: number;
  size?: number;
}

export function Stars({ value, size = 15 }: StarsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        return (
          <Star
            key={i}
            size={size}
            color={filled ? colors.feedback.warning : colors.border.default}
            fill={filled ? colors.feedback.warning : 'transparent'}
            strokeWidth={2}
          />
        );
      })}
    </View>
  );
}
