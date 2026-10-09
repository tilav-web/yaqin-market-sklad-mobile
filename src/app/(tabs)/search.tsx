import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Search as SearchIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { PRICE_RANGES, SearchFilterSheet } from '@/components/SearchFilterSheet';
import {
  FILTER_INIT,
  filterReducer,
  SearchActiveFiltersBar,
  SearchHeaderInput,
  SearchLanding,
} from '@/components/search';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Category, FeedProduct, FeedResponse } from '@/lib/types';
import { useEffectiveCoords } from '@/stores/location';
import { useSearchHistoryStore } from '@/stores/searchHistory';
import { colors, layout, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

const SCREEN_W = Dimensions.get('window').width;
const COLUMNS = 2;
const GUTTER = spacing.md;
const CARD_WIDTH = (SCREEN_W - layout.screenPadding * 2 - GUTTER) / COLUMNS;

export default function SearchTab() {
  const { tr } = useTranslation();
  const coords = useEffectiveCoords();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [filters, dispatch] = useReducer(filterReducer, FILTER_INIT);
  const { categoryIds, priceSort, byRating, priceRange, onlyDiscounted, filterOpen } = filters;

  const history = useSearchHistoryStore((s) => s.terms);
  const addHistory = useSearchHistoryStore((s) => s.add);
  const removeHistory = useSearchHistoryStore((s) => s.remove);
  const clearHistory = useSearchHistoryStore((s) => s.clear);

  // Debounce the text input into the query
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const leafCategories = useMemo(() => {
    const out: Category[] = [];
    for (const root of categoriesQuery.data ?? []) {
      if (root.children?.length) out.push(...root.children);
      else out.push(root);
    }
    return out;
  }, [categoriesQuery.data]);

  const sortParam = useMemo(() => {
    const tokens: string[] = [];
    if (priceSort) tokens.push(priceSort);
    if (byRating) tokens.push('rating');
    return tokens.length ? tokens.join(',') : undefined;
  }, [priceSort, byRating]);

  const categoryParam = categoryIds.length ? categoryIds.join(',') : undefined;
  const range = priceRange ? PRICE_RANGES.find((r) => r.key === priceRange) : null;

  const sortActive = !!priceSort || byRating;
  const activeCount =
    categoryIds.length + (sortActive ? 1 : 0) + (priceRange ? 1 : 0) + (onlyDiscounted ? 1 : 0);

  const hasResults = q.length > 0 || activeCount > 0;

  const feed = useInfiniteQuery({
    queryKey: [
      'search-feed',
      coords?.latitude,
      coords?.longitude,
      q,
      categoryParam,
      sortParam,
      priceRange,
      onlyDiscounted,
    ],
    queryFn: async ({ pageParam }) => {
      if (!coords) return { items: [], nextPage: null } satisfies FeedResponse;
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: {
          lat: coords.latitude,
          lng: coords.longitude,
          page: pageParam,
          limit: 24,
          q: q || undefined,
          categoryIds: categoryParam,
          sort: sortParam,
          minPrice: range?.min,
          maxPrice: range?.max,
          onlyDiscounted: onlyDiscounted || undefined,
        },
      });
      return res.data;
    },
    enabled: !!coords && hasResults && !filterOpen,
    placeholderData: keepPreviousData,
    initialPageParam: 1 as number,
    getNextPageParam: (last) => last.nextPage,
  });

  const items = useMemo<FeedProduct[]>(
    () => feed.data?.pages.flatMap((p) => p.items) ?? [],
    [feed.data],
  );

  const selectedCategories = useMemo(
    () => leafCategories.filter((c) => categoryIds.includes(c.id)),
    [leafCategories, categoryIds],
  );

  const sortSummary = useMemo(() => {
    const parts: string[] = [];
    if (priceSort === 'price_asc') parts.push(tr('sort.cheap'));
    if (priceSort === 'price_desc') parts.push(tr('sort.expensive'));
    if (byRating) parts.push(tr('sort.rating'));
    return parts.join(' + ');
  }, [priceSort, byRating, tr]);

  const toggleCategory = useCallback((id: string) => dispatch({ type: 'TOGGLE_CATEGORY', id }), []);
  const clearSort = useCallback(() => dispatch({ type: 'CLEAR_SORT' }), []);
  const resetFilters = useCallback(() => dispatch({ type: 'RESET_ALL' }), []);

  const runTerm = (term: string) => {
    haptics.selection();
    setInput(term);
    setQ(term);
    addHistory(term);
  };

  const renderProduct = useCallback(
    ({ item }: { item: FeedProduct }) => (
      <ProductCard
        product={item}
        cardWidth={CARD_WIDTH}
        onPress={() => {
          if (q.trim()) addHistory(q.trim());
          router.push(`/product/${item.id}`);
        }}
      />
    ),
    [q, addHistory],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header Search Input */}
      <SearchHeaderInput
        input={input}
        onChangeInput={setInput}
        onSubmit={() => {
          if (input.trim()) addHistory(input.trim());
        }}
        onClear={() => setInput('')}
      />

      {/* Active Filter Bar */}
      <SearchActiveFiltersBar
        activeCount={activeCount}
        sortActive={sortActive}
        sortSummary={sortSummary}
        onClearSort={clearSort}
        priceRange={priceRange}
        onClearPriceRange={() => dispatch({ type: 'SET_PRICE_RANGE', value: null })}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onlyDiscounted={onlyDiscounted}
        onClearDiscounted={() => dispatch({ type: 'SET_ONLY_DISCOUNTED', value: false })}
        onOpenFilter={() => dispatch({ type: 'OPEN_FILTER' })}
      />

      {/* Results or Discovery Landing */}
      {hasResults ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={feed.isFetching && !feed.isLoading && !feed.isFetchingNextPage}
              onRefresh={() => {
                void feed.refetch();
              }}
              tintColor={colors.brand.primary}
              colors={[colors.brand.primary]}
            />
          }
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
          }}
          ListEmptyComponent={
            feed.isLoading || feed.isFetching ? (
              <View>
                <View style={styles.row}>
                  <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                  <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                </View>
                <View style={styles.row}>
                  <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                  <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                </View>
              </View>
            ) : (
              <EmptyState
                icon={SearchIcon}
                title={tr('search.notFound')}
                description={tr('search.notFoundDesc')}
              />
            )
          }
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <ActivityIndicator color={colors.brand.primary} style={{ paddingVertical: spacing.lg }} />
            ) : null
          }
          renderItem={renderProduct}
        />
      ) : (
        <SearchLanding
          history={history}
          onRunTerm={runTerm}
          onRemoveTerm={removeHistory}
          onClearHistory={clearHistory}
          categories={leafCategories}
          onPickCategory={toggleCategory}
        />
      )}

      {/* Filter Bottom Sheet */}
      <SearchFilterSheet
        visible={filterOpen}
        onClose={() => dispatch({ type: 'CLOSE_FILTER' })}
        categories={leafCategories}
        categoryIds={categoryIds}
        onToggleCategory={toggleCategory}
        onClearCategories={() => dispatch({ type: 'RESET_ALL' })}
        priceSort={priceSort}
        setPriceSort={(v) => dispatch({ type: 'SET_PRICE_SORT', value: v })}
        byRating={byRating}
        setByRating={(v) => dispatch({ type: 'SET_BY_RATING', value: v })}
        priceRange={priceRange}
        setPriceRange={(v) => dispatch({ type: 'SET_PRICE_RANGE', value: v })}
        onlyDiscounted={onlyDiscounted}
        setOnlyDiscounted={(v) => dispatch({ type: 'SET_ONLY_DISCOUNTED', value: v })}
        onReset={resetFilters}
        activeCount={activeCount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', gap: GUTTER, marginBottom: GUTTER },
});
