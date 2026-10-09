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
              className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full ${
                isActive ? 'border border-[#FBD9D5]' : ''
              }`}
              style={{
                backgroundColor: isActive ? colors.brand.primarySurface : colors.bg.surfaceMuted,
              }}
            >
              <Text
                className={`text-[13px] ${
                  isActive ? 'font-extrabold text-[#E8392E]' : 'font-semibold'
                }`}
                style={isActive ? undefined : { color: colors.text.secondary }}
              >
                {tab.title}
              </Text>

              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <View
                  className={`rounded-full px-1.5 py-0.5 min-w-[16px] items-center justify-center ${
                    isActive ? 'bg-[#E8392E]' : 'bg-[#DEDAD6]'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isActive ? 'text-white' : 'text-[#7E7872]'
                    }`}
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
