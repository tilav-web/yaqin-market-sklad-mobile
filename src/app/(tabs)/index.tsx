import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressPickerSheet } from '@/components/AddressPickerSheet';
import {
  CategoryTabFeed,
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
import { interleaveProductsByShop } from '@/utils/productMixer';

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

  // Optimized primitive selectors: will NOT trigger screen re-renders on quantity changes
  const targetShopId = useCartStore((s) => {
    for (const id in s.carts) {
      if ((s.carts[id]?.length ?? 0) > 0) return id;
    }
    return null;
  });

  // Brief delay so user immediately sees + increment before cards smoothly settle into place
  const [activeShopId, setActiveShopId] = useState<string | null>(targetShopId);

  useEffect(() => {
    if (targetShopId !== activeShopId) {
      const delayMs = targetShopId ? 220 : 180;
      const timer = setTimeout(() => {
        setActiveShopId(targetShopId);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [targetShopId, activeShopId]);

  const activeShopNameInCart = useCartStore((s) => {
    for (const id in s.carts) {
      const lines = s.carts[id];
      if (lines?.[0]?.shopName) return lines[0].shopName;
    }
    return null;
  });

  const totalCartCount = useCartStore((s) => {
    let count = 0;
    for (const id in s.carts) {
      for (const line of s.carts[id] ?? []) count += line.quantity;
    }
    return count;
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(() => new Set([0]));
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

  const allFeedProducts = useMemo<FeedProduct[]>(
    () => feedQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [feedQuery.data],
  );

  const shops = useMemo(() => shopsQuery.data ?? [], [shopsQuery.data]);

  const activeShopName = useMemo(() => {
    if (!activeShopId) return null;
    if (activeShopNameInCart) return activeShopNameInCart;
    const found = shops.find((s) => s.id === activeShopId);
    return found?.name ?? "Tanlangan do'kon";
  }, [activeShopId, activeShopNameInCart, shops]);

  // Mixed marketplace products feed (Uzum Market style interleaved across shops)
  const mixedAllProducts = useMemo(() => {
    return interleaveProductsByShop(allFeedProducts);
  }, [allFeedProducts]);

  // When a shop is active in cart, simply keep that shop's products in the feed
  const displayedProducts = useMemo<FeedProduct[]>(() => {
    if (!activeShopId) return mixedAllProducts;
    return allFeedProducts.filter((p) => p.shop.id === activeShopId);
  }, [activeShopId, mixedAllProducts, allFeedProducts]);

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
    setVisitedTabs((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
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
        isLoading={categoriesQuery.isLoading}
      />

      {/* Horizontal Pager with lazy mounted tabs */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => {
          const pos = e.nativeEvent.position;
          setActiveTabIndex(pos);
          setVisitedTabs((prev) => {
            if (prev.has(pos)) return prev;
            const next = new Set(prev);
            next.add(pos);
            return next;
          });
        }}
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
        {leafCategories.map((category, idx) => {
          const tabIndex = idx + 1;
          const isMounted = visitedTabs.has(tabIndex);

          return (
            <View key={category.id} style={{ flex: 1, backgroundColor: activeColors.bg.canvas }}>
              {isMounted ? (
                <CategoryTabFeed
                  categoryId={category.id}
                  categoryName={category.nameUzLatn}
                  coords={coords}
                  cardWidth={cardWidth}
                  activeShopId={activeShopId}
                  shopFilterHeader={shopFilterHeader}
                  bottomInset={insets.bottom}
                />
              ) : null}
            </View>
          );
        })}
      </PagerView>

      <AddressPickerSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </SafeAreaView>
  );
}
