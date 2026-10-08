import React, { useRef, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/stores/theme';
import { radius, spacing, typography } from '@/theme';
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
    // rough estimate scroll offset
    const tabWidth = 90;
    const offset = Math.max(0, activeIndex * tabWidth - 100);
    scrollRef.current?.scrollTo({ x: offset, animated: true });
  }, [activeIndex, tabs.length]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.surface, borderBottomColor: colors.border.subtle }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                haptics.selection();
                onSelectTab(idx);
              }}
              style={[
                styles.tabPill,
                { backgroundColor: isActive ? colors.brand.primarySurface : colors.bg.surfaceMuted },
                isActive && { borderWidth: 1, borderColor: colors.brand.primaryBorder },
              ]}>
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.brand.primary : colors.text.secondary },
                  isActive && styles.tabTextActive,
                ]}>
                {tab.title}
              </Text>

              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isActive ? colors.brand.primary : colors.border.default },
                  ]}>
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isActive ? colors.text.onPrimary : colors.text.secondary },
                      isActive && styles.badgeTextActive,
                    ]}>
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

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: 8,
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  tabText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextActive: {},
});
