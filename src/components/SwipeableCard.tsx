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

import { colors, radius, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

const THRESHOLD = 88;

interface Props {
  readonly children: ReactNode;
  /** Swipe left past the threshold — omit to disable (no red reveal, gesture ignored). */
  readonly onDelete?: () => void;
  /** Swipe right past the threshold — omit to disable, e.g. a card that's already default. */
  readonly onMakeDefault?: () => void;
}

/**
 * Hold-and-drag row: swipe left commits a delete (the row itself animates
 * off-screen, no separate confirm — undo lives in the caller's countdown
 * toast), swipe right makes the card the default. Either direction is a
 * no-op if its handler is omitted.
 */
export function SwipeableCard({ children, onDelete, onMakeDefault }: Props) {
  const translateX = useSharedValue(0);
  const crossed = useSharedValue(false);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
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
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(1, -translateX.value / THRESHOLD) : 0,
  }));
  const defaultBgStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(1, translateX.value / THRESHOLD) : 0,
  }));

  return (
    <View style={styles.wrap}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {!!onDelete && (
          <Animated.View style={[styles.bg, styles.bgDelete, deleteBgStyle]}>
            <Trash2 size={20} color="#fff" strokeWidth={2.4} />
          </Animated.View>
        )}
        {!!onMakeDefault && (
          <Animated.View style={[styles.bg, styles.bgDefault, defaultBgStyle]}>
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

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl, overflow: 'hidden' },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  bgDelete: { backgroundColor: colors.feedback.danger, justifyContent: 'flex-end' },
  bgDefault: { backgroundColor: colors.brand.primary, justifyContent: 'flex-start' },
});
