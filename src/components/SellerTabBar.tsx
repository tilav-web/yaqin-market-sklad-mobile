import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { ClipboardList, LucideIcon, NotebookText, Package, Settings, Users, Wallet } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing, typography } from '@/theme';

const ICONS: Record<string, LucideIcon> = {
  orders: ClipboardList,
  inventory: Package,
  debt: NotebookText,
  payables: Wallet,
  staff: Users,
  settings: Settings,
};

const LABELS: Record<string, string> = {
  orders: 'Buyurtmalar',
  inventory: 'Sklad',
  debt: 'Qarz',
  payables: 'Majbur.',
  staff: 'Xodimlar',
  settings: 'Sozlamalar',
};

const SLIDE_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };
const PRESS_SPRING = { damping: 15, stiffness: 350 };
// The floating bar's own horizontal padding — subtracted from the measured
// layout width so the sliding indicator lines up with the tab items (which
// live inside that padding), not the bar's full border-box width.
const BAR_HPADDING = spacing.sm;

interface Props extends BottomTabBarProps {
  /** Route names to omit from the bar — e.g. owner-only tabs for staff. */
  readonly hiddenRoutes?: readonly string[];
}

export function SellerTabBar({ state, navigation, hiddenRoutes }: Props) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const tabs = state.routes.filter((r) => ICONS[r.name] && !hiddenRoutes?.includes(r.name));
  const count = tabs.length;
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === activeKey),
  );
  const itemWidth = count > 0 ? barWidth / count : 0;

  const indicatorX = useSharedValue(0);
  const ready = useRef(false);
  useEffect(() => {
    if (!itemWidth) return;
    const x = activeIndex * itemWidth;
    if (ready.current) {
      indicatorX.value = withSpring(x, SLIDE_SPRING);
    } else {
      indicatorX.value = x;
      ready.current = true;
    }
  }, [activeIndex, itemWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View
        style={styles.bar}
        onLayout={(e) => setBarWidth(Math.max(0, e.nativeEvent.layout.width - BAR_HPADDING * 2))}>
        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, { width: itemWidth }, indicatorStyle]}>
            <View style={styles.pill} />
          </Animated.View>
        )}

        {tabs.map((route, index) => (
          <TabItem
            key={route.key}
            icon={ICONS[route.name]}
            label={LABELS[route.name]}
            focused={index === activeIndex}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (index !== activeIndex && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          />
        ))}
      </View>
    </View>
  );
}

function TabItem({
  icon: Icon,
  label,
  focused,
  onPress,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly focused: boolean;
  readonly onPress: () => void;
}) {
  const prog = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    prog.value = withTiming(focused ? 1 : 0, { duration: 260 });
  }, [focused, prog]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (1 + prog.value * 0.1) }, { translateY: -prog.value * 3 }],
  }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: prog.value }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(prog.value, [0, 1], [colors.text.tertiary, colors.brand.primary]),
    opacity: 0.7 + prog.value * 0.3,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.86, PRESS_SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(1, PRESS_SPRING);
      }}
      style={styles.item}>
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <Icon size={22} color={colors.text.tertiary} strokeWidth={1.9} />
        <Animated.View style={[styles.iconOverlay, activeIconStyle]}>
          <Icon size={22} color={colors.brand.primary} strokeWidth={2.5} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Fully transparent — just reserves the safe-area inset and side margins.
  // The visible bar below floats on top of whatever's actually behind it
  // rather than a second flat-colored strip.
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    paddingHorizontal: BAR_HPADDING,
    marginBottom: spacing.xs,
    ...shadow.lg,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    // Absolutely positioned children measure from the padding edge, not the
    // content edge — offset by the bar's own horizontal padding so the pill
    // lines up with the (padding-affected) flex tab items above it.
    left: BAR_HPADDING,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { width: 52, height: 34, borderRadius: radius.full, backgroundColor: colors.brand.primarySurface },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2 },
  iconWrap: { width: 44, height: 30, alignItems: 'center', justifyContent: 'center' },
  iconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.caption, fontSize: 11, fontWeight: '700' },
});
