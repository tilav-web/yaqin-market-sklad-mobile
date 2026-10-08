import { useQuery } from '@tanstack/react-query';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import {
  LucideIcon,
  MapPin,
  MessageSquare,
  Search as SearchIcon,
  Store,
  User,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Conversation } from '@/lib/types';
import { hideProgress } from '@/stores/scrollHide';
import { useSearchModalStore } from '@/stores/searchModal';
import { useTheme } from '@/stores/theme';
import { colors, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const ICONS: Record<string, LucideIcon> = {
  map: MapPin,
  chats: MessageSquare,
  index: Store,
  profile: User,
};

type LabelKey = 'tab.map' | 'tab.chats' | 'tab.home' | 'tab.profile';
const LABEL_KEYS: Record<string, LabelKey> = {
  map: 'tab.map',
  chats: 'tab.chats',
  index: 'tab.home',
  profile: 'tab.profile',
};

interface TabRoute {
  key: string;
  name: string;
}

export function CustomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark, colors: activeThemeColors } = useTheme();
  const [containerHeight, setContainerHeight] = useState(0);

  // Unread messages count for Calls / Chats tab
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const res = await api.get<Conversation[]>('/conversations');
        return res.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const unreadChats = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [conversations],
  );

  // Slides the whole bottom bar off-screen downward on feed scroll
  const hideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hideProgress.value * (containerHeight + insets.bottom + spacing.lg) }],
  }));

  // Visible Telegram tabs in order: Contacts (map), Calls (chats), Chats (index), Settings (profile)
  const tabs: TabRoute[] = state.routes.filter((r: TabRoute) => ICONS[r.name]);
  const activeKey = state.routes[state.index]?.key;

  return (
    <Animated.View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }, hideStyle]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      <View style={styles.barRow}>
        {/* Telegram Pill Capsule */}
        <View style={[styles.capsule, isDark ? styles.capsuleDark : styles.capsuleLight]}>
          {tabs.map((route: TabRoute) => {
            const isFocused = route.key === activeKey;
            return (
              <TelegramTabItem
                key={route.key}
                icon={ICONS[route.name]}
                labelKey={LABEL_KEYS[route.name]}
                badgeCount={route.name === 'chats' ? unreadChats : 0}
                focused={isFocused}
                isDark={isDark}
                primaryColor={activeThemeColors.brand.primary}
                onPress={() => {
                  haptics.selection();
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </View>

        {/* Telegram Floating Circular Search Button */}
        <Pressable
          onPress={() => {
            haptics.selection();
            useSearchModalStore.getState().open();
          }}
          style={({ pressed }) => [
            styles.searchButton,
            isDark ? styles.searchButtonDark : styles.searchButtonLight,
            pressed && styles.searchButtonPressed,
          ]}>
          <SearchIcon size={22} color={activeThemeColors.brand.primary} strokeWidth={2.4} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

interface TelegramTabItemProps {
  readonly icon: LucideIcon;
  readonly labelKey: LabelKey;
  readonly badgeCount: number;
  readonly focused: boolean;
  readonly isDark: boolean;
  readonly primaryColor: string;
  readonly onPress: () => void;
}

function TelegramTabItem({
  icon: Icon,
  labelKey,
  badgeCount,
  focused,
  isDark,
  primaryColor,
  onPress,
}: TelegramTabItemProps) {
  const { tr } = useTranslation();
  const inactiveColor = isDark ? '#8E8E93' : '#64748B';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabItem,
        pressed && styles.tabItemPressed,
      ]}>
      <View style={styles.tabContent}>
        {/* Soft borderless pill wrap for active tab */}
        <View
          style={[
            styles.iconWrap,
            focused && (isDark ? styles.activePillDark : styles.activePillLight),
          ]}>
          <Icon
            size={20}
            color={focused ? primaryColor : inactiveColor}
            strokeWidth={focused ? 2.4 : 1.9}
          />
          {badgeCount > 0 && (
            <View style={[styles.badge, { borderColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
            </View>
          )}
        </View>

        {/* Tab Label */}
        <Text
          style={[
            styles.tabLabel,
            { color: inactiveColor },
            focused && { color: primaryColor, fontWeight: '700' },
          ]}
          numberOfLines={1}>
          {tr(labelKey)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Capsule base
  capsule: {
    flex: 1,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 29,
    paddingHorizontal: 4,
    elevation: 8,
  },
  capsuleDark: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  capsuleLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabItemPressed: {
    opacity: 0.65,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 44,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activePillDark: {
    backgroundColor: 'rgba(232, 57, 46, 0.18)',
  },
  activePillLight: {
    backgroundColor: 'rgba(232, 57, 46, 0.10)',
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 10.5,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabLabelActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  // Floating Circular Search Button
  searchButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  searchButtonDark: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  searchButtonLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  searchButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
