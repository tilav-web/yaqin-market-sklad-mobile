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
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Conversation } from '@/lib/types';
import { hideProgress } from '@/stores/scrollHide';
import { useSearchModalStore } from '@/stores/searchModal';
import { useTheme } from '@/stores/theme';
import { spacing } from '@/theme';
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
      className="absolute left-0 right-0 bottom-0 px-3"
      style={[{ paddingBottom: Math.max(insets.bottom, 8) }, hideStyle]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      <View className="flex-row items-center gap-2.5">
        {/* Telegram Pill Capsule */}
        <View
          style={{ borderRadius: 29, overflow: 'hidden' }}
          className={`flex-1 h-[58px] flex-row items-center justify-around px-1 ${
            isDark
              ? 'bg-[#1C1C1E] border border-white/10 shadow-lg'
              : 'bg-white border border-black/10 shadow-md'
          }`}>
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
          style={{ borderRadius: 29, overflow: 'hidden' }}
          className={`w-[58px] h-[58px] items-center justify-center active:scale-95 ${
            isDark
              ? 'bg-[#1C1C1E] border border-white/10 shadow-lg'
              : 'bg-white border border-black/10 shadow-md'
          }`}>
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
      className="flex-1 items-center justify-center py-0.5 active:opacity-65">
      <View className="items-center justify-center gap-0.5">
        {/* Soft borderless pill wrap for active tab */}
        <View
          style={{
            borderRadius: 13,
            overflow: 'hidden',
            backgroundColor: focused
              ? (isDark ? 'rgba(232, 57, 46, 0.20)' : 'rgba(232, 57, 46, 0.10)')
              : 'transparent',
          }}
          className="w-11 h-[26px] items-center justify-center relative">
          <Icon
            size={20}
            color={focused ? primaryColor : inactiveColor}
            strokeWidth={focused ? 2.4 : 1.9}
          />
          {badgeCount > 0 && (
            <View
              className={`absolute -top-1 -right-0.5 min-w-[16px] h-4 rounded-full px-1 bg-[#E53935] items-center justify-center border-[1.5px] ${
                isDark ? 'border-[#1C1C1E]' : 'border-white'
              }`}>
              <Text className="text-white text-[9px] font-extrabold leading-[11px]">
                {badgeCount > 99 ? '99+' : badgeCount}
              </Text>
            </View>
          )}
        </View>

        {/* Tab Label */}
        <Text
          className={`text-[10.5px] ${focused ? 'font-bold' : 'font-medium'}`}
          style={{ color: focused ? primaryColor : inactiveColor }}
          numberOfLines={1}>
          {tr(labelKey)}
        </Text>
      </View>
    </Pressable>
  );
}
