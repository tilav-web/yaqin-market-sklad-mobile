import React, { useRef, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

export interface FolderTabItem {
  id: string;
  title: string;
  badge?: number;
}

interface TelegramFolderTabsProps {
  readonly tabs: FolderTabItem[];
  readonly activeIndex: number;
  readonly onSelectTab: (index: number) => void;
}

export function TelegramFolderTabs({
  tabs,
  activeIndex,
  onSelectTab,
}: TelegramFolderTabsProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll the active tab into view
  useEffect(() => {
    if (tabs.length === 0) return;
    const tabWidth = 90;
    const offset = Math.max(0, activeIndex * tabWidth - 100);
    scrollRef.current?.scrollTo({ x: offset, animated: true });
  }, [activeIndex, tabs.length]);

  return (
    <View
      className="border-b py-2"
      style={{ backgroundColor: colors.bg.surface, borderBottomColor: colors.border.subtle }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2 items-center"
      >
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                haptics.selection();
                onSelectTab(idx);
              }}
              className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full"
              style={{
                backgroundColor: isActive ? colors.brand.primarySurface : colors.bg.surfaceMuted,
                borderWidth: isActive ? 1 : 0,
                borderColor: isActive ? colors.brand.primaryBorder : 'transparent',
              }}
            >
              <Text
                className={`text-[13px] ${isActive ? 'font-extrabold' : 'font-semibold'}`}
                style={{ color: isActive ? colors.brand.primary : colors.text.secondary }}
              >
                {tab.title}
              </Text>

              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <View
                  className="rounded-full px-1.5 py-0.5 min-w-[16px] items-center justify-center"
                  style={{
                    backgroundColor: isActive ? colors.brand.primary : colors.bg.surfaceElevated,
                  }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{
                      color: isActive ? '#FFFFFF' : colors.text.secondary,
                    }}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
