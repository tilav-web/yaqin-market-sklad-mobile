import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '@/lib/api';
import { Category, FeedResponse } from '@/lib/types';

interface UseCategoryPrefetchOptions {
  activeTabIndex: number;
  leafCategories: Category[];
  coords: { latitude: number; longitude: number } | null;
}

/**
 * Prefetches adjacent category feeds in advance so swiping between
 * category tabs has 0ms loading time (cached immediately in React Query).
 */
export function useCategoryPrefetch({
  activeTabIndex,
  leafCategories,
  coords,
}: UseCategoryPrefetchOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coords || leafCategories.length === 0) return;

    const prefetchCategory = (cat: Category) => {
      void queryClient.prefetchInfiniteQuery({
        queryKey: ['feed', 'category', cat.id, coords.latitude, coords.longitude],
        queryFn: async ({ pageParam }) => {
          const res = await api.get<FeedResponse>('/catalog/products', {
            params: {
              lat: coords.latitude,
              lng: coords.longitude,
              categoryId: cat.id,
              page: pageParam,
              limit: 30,
            },
          });
          return res.data;
        },
        initialPageParam: 1,
        staleTime: 60_000,
      });
    };

    // Tab 0 is 'all', so next category is leafCategories[0] (Tab 1)
    const nextCat = leafCategories[activeTabIndex];
    if (nextCat) {
      prefetchCategory(nextCat);
    }

    // Prefetch two ahead so fast swiping also hits warm cache
    const secondNextCat = leafCategories[activeTabIndex + 1];
    if (secondNextCat) {
      prefetchCategory(secondNextCat);
    }
  }, [activeTabIndex, leafCategories, coords, queryClient]);
}
