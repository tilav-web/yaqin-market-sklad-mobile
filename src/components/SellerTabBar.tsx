import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { ClipboardList, LucideIcon, NotebookText, Package, Settings, Users, Wallet } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadow, spacing, typography } from '@/theme';

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
const BAR_HPADDING = spacing.sm;

interface Props extends BottomTabBarProps {
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
    <View
      className="absolute inset-x-0 bottom-0 px-3 pt-1"
      style={{ paddingBottom: Math.max(insets.bottom, spacing.sm) }}>
      <View
        className="flex-row items-center justify-between rounded-3xl border mb-1 px-2"
        style={[
          {
            backgroundColor: colors.bg.surface,
            borderColor: colors.brand.primaryBorder,
          },
          shadow.lg,
        ]}
        onLayout={(e) => setBarWidth(Math.max(0, e.nativeEvent.layout.width - BAR_HPADDING * 2))}>
        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            className="absolute top-1 left-2 h-8.5 items-center justify-center"
            style={[{ width: itemWidth }, indicatorStyle]}>
            <View
              className="w-13 h-8.5 rounded-full"
              style={{ backgroundColor: colors.brand.primarySurface }}
            />
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
      className="flex-1 items-center justify-center py-1.5 gap-0.5">
      <Animated.View className="w-11 h-7.5 items-center justify-center relative" style={iconWrapStyle}>
        <Icon size={22} color={colors.text.tertiary} strokeWidth={1.9} />
        <Animated.View className="absolute inset-0 items-center justify-center" style={activeIconStyle}>
          <Icon size={22} color={colors.brand.primary} strokeWidth={2.5} />
        </Animated.View>
      </Animated.View>
      <Animated.Text
        className="text-[11px] font-bold"
        style={[typography.caption, labelStyle]}
        numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}
