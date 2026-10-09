import { Star, Trash2 } from 'lucide-react-native';
import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

const THRESHOLD = 88;
const HOLD_DURATION = 180;

interface Props {
  readonly children: ReactNode;
  /** Swipe left past the threshold — omit to disable */
  readonly onDelete?: () => void;
  /** Swipe right past the threshold — omit to disable */
  readonly onMakeDefault?: () => void;
}

/**
 * Hold-then-drag row: a short hold arms the swipe. Left commits a delete,
 * right makes the card the default.
 */
export function SwipeableCard({ children, onDelete, onMakeDefault }: Props) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const crossed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(HOLD_DURATION)
    .failOffsetY([-14, 14])
    .onStart(() => {
      scale.value = withTiming(0.96, { duration: 120 });
      runOnJS(haptics.medium)();
    })
    .onUpdate((e) => {
      let x = e.translationX;
      if (x < 0 && !onDelete) x = 0;
      if (x > 0 && !onMakeDefault) x = 0;
      translateX.value = x;
      const past = Math.abs(x) > THRESHOLD;
      if (past !== crossed.value) {
        crossed.value = past;
        runOnJS(haptics.selection)();
      }
    })
    .onEnd((e) => {
      if (e.translationX <= -THRESHOLD && onDelete) {
        translateX.value = withTiming(-420, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onDelete)();
        });
      } else if (e.translationX >= THRESHOLD && onMakeDefault) {
        translateX.value = withSpring(0);
        runOnJS(onMakeDefault)();
      } else {
        translateX.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      scale.value = withTiming(1, { duration: 150 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));
  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(1, -translateX.value / THRESHOLD) : 0,
  }));
  const defaultBgStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(1, translateX.value / THRESHOLD) : 0,
  }));

  return (
    <View className="rounded-2xl overflow-hidden relative">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {!!onDelete && (
          <Animated.View
            className="absolute inset-0 flex-row items-center px-4 justify-end"
            style={[{ backgroundColor: colors.feedback.danger }, deleteBgStyle]}
          >
            <Trash2 size={20} color="#fff" strokeWidth={2.4} />
          </Animated.View>
        )}
        {!!onMakeDefault && (
          <Animated.View
            className="absolute inset-0 flex-row items-center px-4 justify-start"
            style={[{ backgroundColor: colors.brand.primary }, defaultBgStyle]}
          >
            <Star size={20} color="#fff" fill="#fff" />
          </Animated.View>
        )}
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}
