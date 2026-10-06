import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  ChevronDown,
  MapPin,
  Search as SearchIcon,
  ShoppingBag,
  Store,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressPickerSheet } from '@/components/AddressPickerSheet';
import {
  FolderTabItem,
  TelegramFolderTabs,
} from '@/components/telegram/TelegramFolderTabs';
import { TelegramProductRow } from '@/components/telegram/TelegramProductRow';
import { TelegramShopRow } from '@/components/telegram/TelegramShopRow';
import { TelegramShopStoryAvatar } from '@/components/telegram/TelegramShopStoryAvatar';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Category, FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function TelegramHomeScreen() {
  const { tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const coords = useEffectiveCoords();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refresh = useLocationStore((s) => s.refresh);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  useEffect(() => {
    if (!permissionStatus) {
      void requestPermission().then(() => refresh());
    } else if (permissionStatus === 'granted' && !coords) {
      void refresh();
    }
  }, [permissionStatus, coords, requestPermission, refresh]);

  // Nearby Shops Query
  const shopsQuery = useQuery({
    queryKey: ['shops', 'nearby', coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: { lat: coords.latitude, lng: coords.longitude },
      });
      return res.data;
    },
    enabled: !!coords,
    staleTime: 60_000,
  });

  // Global Products Feed Query
  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', coords?.latitude, coords?.longitude],
    queryFn: async ({ pageParam }) => {
      if (!coords) return { items: [], nextPage: null } satisfies FeedResponse;
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: { lat: coords.latitude, lng: coords.longitude, page: pageParam, limit: 30 },
      });
      return res.data;
    },
    enabled: !!coords,
    initialPageParam: 1 as number,
    getNextPageParam: (last) => last.nextPage,
  });

  // Categories Query
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const leafCategories = useMemo(() => {
    const list: Category[] = [];
    for (const root of categoriesQuery.data ?? []) {
      if (root.children && root.children.length > 0) {
        list.push(...root.children);
      } else {
        list.push(root);
      }
    }
    return list;
  }, [categoriesQuery.data]);

  const allProducts = useMemo<FeedProduct[]>(
    () => feedQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [feedQuery.data],
  );

  const shops = shopsQuery.data ?? [];

  // Telegram Top Folder Tabs List
  const folderTabs = useMemo<FolderTabItem[]>(() => {
    const list: FolderTabItem[] = [
      { id: 'all', title: 'Barchasi' },
      { id: 'shops', title: 'Do\'konlar', badge: shops.length },
    ];
    for (const cat of leafCategories) {
      list.push({
        id: cat.id,
        title: cat.nameUzLatn,
      });
    }
    return list;
  }, [shops.length, leafCategories]);

  const handleSelectTab = useCallback((index: number) => {
    setActiveTabIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  const locationLabel = useMemo(() => {
    if (selectedAddress?.name) return selectedAddress.name;
    if (coords?.address) return coords.address;
    return 'Manzilni tanlang';
  }, [selectedAddress, coords]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Telegram Style Top Header */}
      <View style={styles.header}>
        {/* Left: Location Picker */}
        <Pressable
          onPress={() => {
            haptics.selection();
            setPickerOpen(true);
          }}
          style={styles.locationPill}>
          <MapPin size={15} color={colors.brand.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
          <ChevronDown size={14} color={colors.text.secondary} />
        </Pressable>

        {/* Center: Brand Name */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Yaqin</Text>
        </View>

        {/* Right: Search & Notifications */}
        <View style={styles.rightActions}>
          <Pressable
            onPress={() => {
              haptics.selection();
              router.push('/(tabs)/search');
            }}
            style={styles.iconButton}>
            <SearchIcon size={19} color={colors.text.primary} />
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.selection();
              router.push('/notifications');
            }}
            style={styles.iconButton}>
            <Bell size={19} color={colors.text.primary} />
          </Pressable>
        </View>
      </View>

      {/* Telegram Swipeable Category Tabs (Folders) */}
      <TelegramFolderTabs
        tabs={folderTabs}
        activeIndex={activeTabIndex}
        onSelectTab={handleSelectTab}
      />

      {/* Telegram Pager View (horizontal swiping between folders) */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => {
          setActiveTabIndex(e.nativeEvent.position);
        }}>
        {/* Tab 0: Barchasi (Story Shops + Telegram Product Rows) */}
        <View key="all" style={styles.page}>
          <FlatList
            data={allProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TelegramProductRow item={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 85 },
            ]}
            ListHeaderComponent={
              shops.length > 0 ? (
                <View style={styles.storiesSection}>
                  <Text style={styles.sectionTitle}>Do'konlar</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesScroll}>
                    {shops.map((shop) => (
                      <TelegramShopStoryAvatar key={shop.id} shop={shop} />
                    ))}
                  </ScrollView>
                  <View style={styles.storiesDivider} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              feedQuery.isLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color={colors.brand.primary} />
                </View>
              ) : (
                <View style={styles.centerLoading}>
                  <EmptyState
                    title="Mahsulotlar topilmadi"
                    description="Hududingizda hozircha faol tovarlar yo'q"
                  />
                </View>
              )
            }
            onEndReached={() => {
              if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
                void feedQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={feedQuery.isRefetching}
                onRefresh={() => {
                  void feedQuery.refetch();
                  void shopsQuery.refetch();
                }}
                tintColor={colors.brand.primary}
              />
            }
          />
        </View>

        {/* Tab 1: Do'konlar (Telegram Shop Rows) */}
        <View key="shops" style={styles.page}>
          <FlatList
            data={shops}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TelegramShopRow shop={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 85 },
            ]}
            ListEmptyComponent={
              shopsQuery.isLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color={colors.brand.primary} />
                </View>
              ) : (
                <View style={styles.centerLoading}>
                  <EmptyState
                    title="Do'konlar topilmadi"
                    description="Yaqin-atrofda faol do'konlar mavjud emas"
                  />
                </View>
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={shopsQuery.isRefetching}
                onRefresh={() => void shopsQuery.refetch()}
                tintColor={colors.brand.primary}
              />
            }
          />
        </View>

        {/* Tabs 2..N: Dynamic Category Folders */}
        {leafCategories.map((category) => {
          const categoryProducts = allProducts.filter(
            (p) => p.categoryId === category.id,
          );
          return (
            <View key={category.id} style={styles.page}>
              <FlatList
                data={categoryProducts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TelegramProductRow item={item} />}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: insets.bottom + 85 },
                ]}
                ListEmptyComponent={
                  <View style={styles.centerLoading}>
                    <EmptyState
                      title={`${category.nameUzLatn} bo'yicha tovar yo'q`}
                      description="Tez orada yangi mahsulotlar qo'shiladi"
                    />
                  </View>
                }
                refreshControl={
                  <RefreshControl
                    refreshing={feedQuery.isRefetching}
                    onRefresh={() => void feedQuery.refetch()}
                    tintColor={colors.brand.primary}
                  />
                }
              />
            </View>
          );
        })}
      </PagerView>

      <AddressPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    maxWidth: 135,
  },
  locationText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
    maxWidth: 80,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '900',
    color: colors.brand.primary,
    letterSpacing: -0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
  },
  storiesSection: {
    backgroundColor: colors.bg.surface,
    paddingTop: 10,
    paddingBottom: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
  },
  storiesScroll: {
    paddingHorizontal: spacing.md,
  },
  storiesDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginTop: 10,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginLeft: spacing.lg + 58 + spacing.md, // Telegram inset separator
  },
  centerLoading: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
