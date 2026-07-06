import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { ClipboardList, LucideIcon, NotebookText, Package, Settings, Users } from 'lucide-react-native';
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
  staff: Users,
  settings: Settings,
};

const LABELS: Record<string, string> = {
  orders: 'Buyurtmalar',
  inventory: 'Sklad',
  debt: 'Qarz',
  staff: 'Xodimlar',
  settings: 'Sozlamalar',
};

const SLIDE_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };
const PRESS_SPRING = { damping: 15, stiffness: 350 };

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
      <View style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
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
  container: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    ...shadow.md,
  },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 0,
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
