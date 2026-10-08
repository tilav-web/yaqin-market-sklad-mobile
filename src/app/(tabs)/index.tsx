import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bell,
  ChevronDown,
  MapPin,
  Search as SearchIcon,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressPickerSheet } from '@/components/AddressPickerSheet';
import {
  FolderTabItem,
  TelegramFolderTabs,
} from '@/components/telegram/TelegramFolderTabs';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { Category, FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { useCartStore } from '@/stores/cart';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { useTheme } from '@/stores/theme';
import { radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_W = Dimensions.get('window').width;
const GRID_PADDING = 14;
const GRID_GAP = 10;
const CARD_WIDTH = (SCREEN_W - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function TelegramHomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors: activeColors } = useTheme();
  const coords = useEffectiveCoords();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refresh = useLocationStore((s) => s.refresh);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const carts = useCartStore((s) => s.carts);
  const clearAll = useCartStore((s) => s.clearAll);

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

  // Active shop restriction: when items are added to cart from a shop,
  // we filter displayed products solely to that shop.
  const cartShopIds = useMemo(
    () => Object.keys(carts).filter((id) => (carts[id]?.length ?? 0) > 0),
    [carts],
  );
  const activeShopId = cartShopIds.length > 0 ? cartShopIds[0] : null;

  const activeShopName = useMemo(() => {
    if (!activeShopId) return null;
    const lines = carts[activeShopId];
    if (lines && lines.length > 0 && lines[0].shopName) {
      return lines[0].shopName;
    }
    const found = shops.find((s) => s.id === activeShopId);
    return found?.name ?? "Tanlangan do'kon";
  }, [activeShopId, carts, shops]);

  const totalCartCount = useMemo(() => {
    return Object.values(carts).reduce(
      (acc, lines) => acc + lines.reduce((sum, l) => sum + l.quantity, 0),
      0,
    );
  }, [carts]);

  // Animate product list filtering on cart changes
  const prevShopIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevShopIdRef.current !== activeShopId) {
      prevShopIdRef.current = activeShopId;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [activeShopId]);

  const displayedProducts = useMemo(() => {
    if (!activeShopId) return allProducts;
    return allProducts.filter((p) => p.shop.id === activeShopId);
  }, [allProducts, activeShopId]);

  // Telegram Top Folder Tabs List
  const folderTabs = useMemo<FolderTabItem[]>(() => {
    const list: FolderTabItem[] = [
      { id: 'all', title: 'Barchasi' },
    ];
    for (const cat of leafCategories) {
      list.push({
        id: cat.id,
        title: cat.nameUzLatn,
      });
    }
    return list;
  }, [leafCategories]);

  const handleSelectTab = useCallback((index: number) => {
    setActiveTabIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  const locationLabel = useMemo(() => {
    if (selectedAddress?.label) return selectedAddress.label;
    if (selectedAddress?.address) return selectedAddress.address;
    if (coords) return 'Joriy joylashuv';
    return 'Manzilni tanlang';
  }, [selectedAddress, coords]);

  // Active Shop Filter Banner Component
  const renderShopFilterNotice = () => {
    if (!activeShopId) return null;
    return (
      <View
        style={[
          styles.shopFilterBanner,
          {
            backgroundColor: activeColors.brand.primarySurface,
            borderColor: activeColors.brand.primaryBorder,
          },
        ]}>
        <View style={styles.shopFilterInfo}>
          <Store size={15} color={activeColors.brand.primary} />
          <Text
            style={[styles.shopFilterText, { color: activeColors.text.primary }]}
            numberOfLines={1}>
            Faqat{' '}
            <Text style={{ fontWeight: '800', color: activeColors.brand.primary }}>
              {activeShopName}
            </Text>{' '}
            tovarlari ko'rsatilmoqda
          </Text>
        </View>
        <Pressable
          onPress={() => {
            haptics.selection();
            clearAll();
          }}
          hitSlop={8}
          style={[
            styles.shopFilterClearBtn,
            { backgroundColor: activeColors.bg.surface },
          ]}>
          <X size={12} color={activeColors.text.secondary} />
          <Text
            style={[
              styles.shopFilterClearText,
              { color: activeColors.text.secondary },
            ]}>
            Barchasi
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: activeColors.bg.canvas }]}>
      {/* Telegram Style Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: activeColors.bg.surface,
            borderBottomColor: activeColors.border.subtle,
          },
        ]}>
        {/* Left: Location Picker */}
        <Pressable
          onPress={() => {
            haptics.selection();
            setPickerOpen(true);
          }}
          style={[
            styles.locationPill,
            { backgroundColor: activeColors.bg.surfaceMuted },
          ]}>
          <MapPin size={15} color={activeColors.brand.primary} />
          <Text
            style={[styles.locationText, { color: activeColors.text.primary }]}
            numberOfLines={1}>
            {locationLabel}
          </Text>
          <ChevronDown size={14} color={activeColors.text.secondary} />
        </Pressable>

        {/* Center: Brand Name */}
        <View style={styles.brandContainer}>
          <Text
            style={[styles.brandTitle, { color: activeColors.brand.primary }]}>
            Yaqin
          </Text>
        </View>

        {/* Right: Cart & Notifications */}
        <View style={styles.rightActions}>
          <Pressable
            onPress={() => {
              haptics.selection();
              router.push('/(tabs)/carts');
            }}
            style={[
              styles.iconButton,
              { backgroundColor: activeColors.bg.surfaceMuted },
            ]}>
            <ShoppingBag size={19} color={activeColors.text.primary} />
            {totalCartCount > 0 && (
              <View
                style={[
                  styles.cartBadge,
                  {
                    backgroundColor: activeColors.brand.primary,
                    borderColor: activeColors.bg.surface,
                  },
                ]}>
                <Text style={styles.cartBadgeText}>
                  {totalCartCount > 99 ? '99+' : totalCartCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.selection();
              router.push('/notifications');
            }}
            style={[
              styles.iconButton,
              { backgroundColor: activeColors.bg.surfaceMuted },
            ]}>
            <Bell size={19} color={activeColors.text.primary} />
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
        {/* Tab 0: Barchasi (2-column product grid with single shop filter) */}
        <View
          key="all"
          style={[styles.page, { backgroundColor: activeColors.bg.canvas }]}>
          <FlatList
            data={displayedProducts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridColumnWrapper}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                cardWidth={CARD_WIDTH}
                onPress={() => router.push(`/product/${item.id}` as any)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.gridSeparator} />}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 85 },
            ]}
            ListHeaderComponent={renderShopFilterNotice}
            ListEmptyComponent={
              feedQuery.isLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator
                    size="large"
                    color={activeColors.brand.primary}
                  />
                </View>
              ) : (
                <View style={styles.centerLoading}>
                  <EmptyState
                    icon={ShoppingBag}
                    title="Mahsulotlar topilmadi"
                    description={
                      activeShopId
                        ? "Ushbu do'konda boshqa mahsulot topilmadi"
                        : "Hududingizda hozircha faol tovarlar yo'q"
                    }
                  />
                </View>
              )
            }
            ListFooterComponent={
              feedQuery.isFetchingNextPage ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={activeColors.brand.primary} />
                </View>
              ) : null
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
                tintColor={activeColors.brand.primary}
              />
            }
          />
        </View>

        {/* Dynamic Category Folders */}
        {leafCategories.map((category) => {
          let categoryProducts = allProducts.filter(
            (p) => p.categoryId === category.id,
          );
          if (activeShopId) {
            categoryProducts = categoryProducts.filter(
              (p) => p.shop.id === activeShopId,
            );
          }
          return (
            <View
              key={category.id}
              style={[styles.page, { backgroundColor: activeColors.bg.canvas }]}>
              <FlatList
                data={categoryProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.gridColumnWrapper}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    cardWidth={CARD_WIDTH}
                    onPress={() => router.push(`/product/${item.id}` as any)}
                  />
                )}
                ItemSeparatorComponent={() => <View style={styles.gridSeparator} />}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: insets.bottom + 85 },
                ]}
                ListHeaderComponent={renderShopFilterNotice}
                ListEmptyComponent={
                  <View style={styles.centerLoading}>
                    <EmptyState
                      icon={ShoppingBag}
                      title={`${category.nameUzLatn} bo'yicha tovar yo'q`}
                      description="Tez orada yangi mahsulotlar qo'shiladi"
                    />
                  </View>
                }
                refreshControl={
                  <RefreshControl
                    refreshing={feedQuery.isRefetching}
                    onRefresh={() => void feedQuery.refetch()}
                    tintColor={activeColors.brand.primary}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    maxWidth: 135,
  },
  locationText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 80,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '900',
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
  shopFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  shopFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  shopFilterText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  shopFilterClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  shopFilterClearText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 58 + spacing.md, // Telegram inset separator
  },
  gridColumnWrapper: {
    paddingHorizontal: 14,
    gap: 10,
  },
  gridSeparator: {
    height: 10,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
  centerLoading: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
