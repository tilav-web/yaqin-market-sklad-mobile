import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressPickerSheet } from '@/components/AddressPickerSheet';
import {
  HomeProductGrid,
  HomeShopFilterBanner,
  HomeTopBar,
} from '@/components/home';
import {
  FolderTabItem,
  TelegramFolderTabs,
} from '@/components/telegram/TelegramFolderTabs';
import { api } from '@/lib/api';
import { Category, FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { useCartStore } from '@/stores/cart';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { useTheme } from '@/stores/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TelegramHomeScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors: activeColors } = useTheme();
  const coords = useEffectiveCoords();

  const cardWidth = useMemo(
    () => Math.floor((screenWidth - 14 * 2 - 10) / 2),
    [screenWidth],
  );
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

  const shops = useMemo(() => shopsQuery.data ?? [], [shopsQuery.data]);

  // Active shop restriction
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
    const list: FolderTabItem[] = [{ id: 'all', title: 'Barchasi' }];
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

  const shopFilterHeader = (
    <HomeShopFilterBanner
      activeShopId={activeShopId}
      activeShopName={activeShopName}
      onClear={clearAll}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: activeColors.bg.canvas }}>
      {/* Top Header */}
      <HomeTopBar
        locationLabel={locationLabel}
        onOpenLocationPicker={() => setPickerOpen(true)}
        totalCartCount={totalCartCount}
      />

      {/* Swipeable Category Folder Tabs */}
      <TelegramFolderTabs
        tabs={folderTabs}
        activeIndex={activeTabIndex}
        onSelectTab={handleSelectTab}
      />

      {/* Horizontal Pager for category folders */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setActiveTabIndex(e.nativeEvent.position)}
      >
        {/* Tab 0: Barchasi */}
        <View key="all" style={{ flex: 1, backgroundColor: activeColors.bg.canvas }}>
          <HomeProductGrid
            products={displayedProducts}
            cardWidth={cardWidth}
            isLoading={feedQuery.isLoading}
            emptyTitle="Mahsulotlar topilmadi"
            emptyDescription={
              activeShopId
                ? "Ushbu do'konda boshqa mahsulot topilmadi"
                : "Hududingizda hozircha faol tovarlar yo'q"
            }
            isRefetching={feedQuery.isRefetching}
            onRefresh={() => {
              void feedQuery.refetch();
              void shopsQuery.refetch();
            }}
            onEndReached={() => {
              if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
                void feedQuery.fetchNextPage();
              }
            }}
            isFetchingNextPage={feedQuery.isFetchingNextPage}
            bottomInset={insets.bottom}
            headerComponent={shopFilterHeader}
          />
        </View>

        {/* Dynamic Category Folders */}
        {leafCategories.map((category) => {
          let categoryProducts = allProducts.filter((p) => p.categoryId === category.id);
          if (activeShopId) {
            categoryProducts = categoryProducts.filter((p) => p.shop.id === activeShopId);
          }
          return (
            <View key={category.id} style={{ flex: 1, backgroundColor: activeColors.bg.canvas }}>
              <HomeProductGrid
                products={categoryProducts}
                cardWidth={cardWidth}
                emptyTitle={`${category.nameUzLatn} bo'yicha tovar yo'q`}
                emptyDescription="Tez orada yangi mahsulotlar qo'shiladi"
                isRefetching={feedQuery.isRefetching}
                onRefresh={() => void feedQuery.refetch()}
                bottomInset={insets.bottom}
                headerComponent={shopFilterHeader}
              />
            </View>
          );
        })}
      </PagerView>

      <AddressPickerSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </SafeAreaView>
  );
}
