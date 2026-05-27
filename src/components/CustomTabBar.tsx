import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { Home, MapPin, Search, ShoppingBag, User, LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  map: MapPin,
  search: Search,
  carts: ShoppingBag,
  profile: User,
};

const LABEL_KEYS: Record<string, 'tab.home' | 'tab.map' | 'tab.search' | 'tab.carts' | 'tab.profile'> = {
  index: 'tab.home',
  map: 'tab.map',
  search: 'tab.search',
  carts: 'tab.carts',
  profile: 'tab.profile',
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          if (!ICONS[route.name]) return null;
          const focused = state.index === index;
          return (
            <TabItem
              key={route.key}
              icon={ICONS[route.name]}
              labelKey={LABEL_KEYS[route.name]}
              focused={focused}
              onPress={() => {
                haptics.selection();
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

interface TabItemProps {
  icon: LucideIcon;
  labelKey: 'tab.home' | 'tab.map' | 'tab.search' | 'tab.carts' | 'tab.profile';
  focused: boolean;
  onPress: () => void;
}

function TabItem({ icon: Icon, labelKey, focused, onPress }: TabItemProps) {
  const { tr } = useTranslation();
  const scale = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  const pillOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pillScale = useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1 : 0.95, friction: 7, useNativeDriver: true }),
      Animated.timing(pillOpacity, { toValue: focused ? 1 : 0, duration: 220, useNativeDriver: true }),
      Animated.spring(pillScale, {
        toValue: focused ? 1 : 0.7,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, pillOpacity, pillScale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(pressScale, { toValue: 0.93, friction: 6, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()
      }
      style={styles.item}>
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Animated.View
          style={[
            styles.pill,
            {
              opacity: pillOpacity,
              transform: [{ scale: pillScale }],
            },
          ]}
        />
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
          <Icon
            size={22}
            color={focused ? colors.brand.primary : colors.text.tertiary}
            strokeWidth={focused ? 2.4 : 1.8}
          />
        </Animated.View>
      </Animated.View>
      <Text
        style={[
          styles.label,
          { color: focused ? colors.brand.primary : colors.text.tertiary },
          focused && { fontWeight: '700' },
        ]}>
        {tr(labelKey)}
      </Text>
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    width: 44,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});
