import { useInfiniteQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { api } from '@/lib/api';
import { FeedProduct, FeedResponse } from '@/lib/types';
import { interleaveProductsByShop } from '@/utils/productMixer';

import { HomeProductGrid } from './HomeProductGrid';

interface CategoryTabFeedProps {
  categoryId: string;
  categoryName: string;
  coords: { latitude: number; longitude: number } | null;
  cardWidth: number;
  activeShopId: string | null;
  shopFilterHeader?: React.ReactElement | null;
  bottomInset: number;
}

export function CategoryTabFeed({
  categoryId,
  categoryName,
  coords,
  cardWidth,
  activeShopId,
  shopFilterHeader,
  bottomInset,
}: CategoryTabFeedProps) {
  const query = useInfiniteQuery({
    queryKey: ['feed', 'category', categoryId, coords?.latitude, coords?.longitude],
    queryFn: async ({ pageParam }) => {
      if (!coords) return { items: [], nextPage: null } satisfies FeedResponse;
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: {
          lat: coords.latitude,
          lng: coords.longitude,
          categoryId,
          page: pageParam,
          limit: 30,
        },
      });
      return res.data;
    },
    enabled: !!coords,
    initialPageParam: 1 as number,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 60_000,
  });

  const allCategoryProducts = useMemo<FeedProduct[]>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const displayedProducts = useMemo<FeedProduct[]>(() => {
    if (!activeShopId) return interleaveProductsByShop(allCategoryProducts);
    return allCategoryProducts.filter((p) => p.shop.id === activeShopId);
  }, [activeShopId, allCategoryProducts]);

  return (
    <HomeProductGrid
      products={displayedProducts}
      cardWidth={cardWidth}
      isLoading={query.isLoading}
      emptyTitle={`${categoryName} bo'yicha tovar topilmadi`}
      emptyDescription="Hududingizda ushbu toifadagi tovarlar hozircha yo'q"
      isRefetching={query.isRefetching}
      onRefresh={() => void query.refetch()}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      isFetchingNextPage={query.isFetchingNextPage}
      bottomInset={bottomInset}
      headerComponent={shopFilterHeader}
    />
  );
}
