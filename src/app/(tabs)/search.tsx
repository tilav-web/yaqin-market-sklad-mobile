import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Clock, Search as SearchIcon, SlidersHorizontal, Tag, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import {
  PRICE_RANGES,
  PriceRangeKey,
  PriceSort,
  SearchFilterSheet,
} from '@/components/SearchFilterSheet';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Category, FeedProduct, FeedResponse } from '@/lib/types';
import { useEffectiveCoords } from '@/stores/location';
import { useSearchHistoryStore } from '@/stores/searchHistory';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const SCREEN_W = Dimensions.get('window').width;
const COLUMNS = 2;
const GUTTER = spacing.md;
const CARD_WIDTH = (SCREEN_W - layout.screenPadding * 2 - GUTTER) / COLUMNS;

export default function SearchTab() {
  const { tr, catName } = useTranslation();
  const coords = useEffectiveCoords();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [priceSort, setPriceSort] = useState<PriceSort>(null);
  const [byRating, setByRating] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceRangeKey | null>(null);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const history = useSearchHistoryStore((s) => s.terms);
  const addHistory = useSearchHistoryStore((s) => s.add);
  const removeHistory = useSearchHistoryStore((s) => s.remove);
  const clearHistory = useSearchHistoryStore((s) => s.clear);

  // Debounce the text input into the query.
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

  // Compound sort: price direction first (primary), rating as tiebreaker.
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

  // The search page stays empty (discovery landing) until the user actually
  // searches or applies a filter — products only appear on intent.
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
    // While the filter sheet is open the results are hidden behind it, so we
    // pause refetching — otherwise every category tap fires a network request
    // and re-renders the (invisible) grid. One fetch runs when the sheet closes.
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

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSort = () => {
    setPriceSort(null);
    setByRating(false);
  };
  const resetFilters = () => {
    setCategoryIds([]);
    clearSort();
    setPriceRange(null);
    setOnlyDiscounted(false);
  };

  // Run a saved/suggested term: fill the box, search immediately, remember it.
  const runTerm = (term: string) => {
    haptics.selection();
    setInput(term);
    setQ(term);
    addHistory(term);
  };

  // Stable renderItem so toggling filters (which re-renders this screen) never
  // re-renders the product grid rows.
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
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <SearchIcon size={20} color={colors.text.tertiary} strokeWidth={2.4} />
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={tr('search.placeholder')}
            placeholderTextColor={colors.text.hint}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => {
              if (input.trim()) addHistory(input.trim());
            }}
          />
          {input.length > 0 && (
            <Pressable onPress={() => setInput('')} hitSlop={8}>
              <X size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filterBar}>
        <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
          <SlidersHorizontal size={16} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.filterBtnText}>{tr('filter.button')}</Text>
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </Pressable>

        {activeCount === 0 ? (
          <Text style={styles.filterHint} numberOfLines={1}>
            {tr('filter.hint')}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeRow}
            keyboardShouldPersistTaps="handled">
            {sortActive ? <ActiveChip label={sortSummary} onRemove={clearSort} /> : null}
            {range ? (
              <ActiveChip label={tr(range.labelKey)} onRemove={() => setPriceRange(null)} />
            ) : null}
            {selectedCategories.map((c) => (
              <ActiveChip key={c.id} label={catName(c)} onRemove={() => toggleCategory(c.id)} />
            ))}
            {onlyDiscounted && (
              <ActiveChip label={tr('filter.discounted')} onRemove={() => setOnlyDiscounted(false)} />
            )}
          </ScrollView>
        )}
      </View>

      {hasResults ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

      <SearchFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={leafCategories}
        categoryIds={categoryIds}
        onToggleCategory={toggleCategory}
        onClearCategories={() => setCategoryIds([])}
        priceSort={priceSort}
        setPriceSort={setPriceSort}
        byRating={byRating}
        setByRating={setByRating}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        onlyDiscounted={onlyDiscounted}
        setOnlyDiscounted={setOnlyDiscounted}
        onReset={resetFilters}
        activeCount={activeCount}
      />
    </SafeAreaView>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Pressable style={styles.activeChip} onPress={onRemove}>
      <Text style={styles.activeChipText}>{label}</Text>
      <X size={13} color={colors.brand.primary} strokeWidth={2.8} />
    </Pressable>
  );
}

interface LandingProps {
  readonly history: string[];
  readonly onRunTerm: (t: string) => void;
  readonly onRemoveTerm: (t: string) => void;
  readonly onClearHistory: () => void;
  readonly categories: Category[];
  readonly onPickCategory: (id: string) => void;
}
function SearchLanding({
  history,
  onRunTerm,
  onRemoveTerm,
  onClearHistory,
  categories,
  onPickCategory,
}: LandingProps) {
  const { tr, catName } = useTranslation();
  return (
    <ScrollView
      style={styles.landing}
      contentContainerStyle={styles.landingContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {history.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Clock size={15} color={colors.text.secondary} strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>{tr('search.recent')}</Text>
            </View>
            <Pressable onPress={onClearHistory} hitSlop={8}>
              <Text style={styles.clearAll}>{tr('search.clear')}</Text>
            </Pressable>
          </View>
          <View style={styles.wrap}>
            {history.map((term) => (
              <View key={term} style={styles.historyChip}>
                <Pressable
                  style={styles.historyChipMain}
                  onPress={() => onRunTerm(term)}
                  hitSlop={6}>
                  <Clock size={12} color={colors.text.tertiary} strokeWidth={2.4} />
                  <Text style={styles.historyChipText} numberOfLines={1}>
                    {term}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onRemoveTerm(term)} hitSlop={8} style={styles.historyX}>
                  <X size={13} color={colors.text.tertiary} strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeadLeft}>
          <Tag size={15} color={colors.text.secondary} strokeWidth={2.4} />
          <Text style={styles.sectionTitle}>{tr('search.categories')}</Text>
        </View>
        <View style={[styles.wrap, { marginTop: spacing.md }]}>
          {categories.map((c) => (
            <Pressable key={c.id} style={styles.catChip} onPress={() => onPickCategory(c.id)}>
              <Text style={styles.catChipText}>{catName(c)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  searchHeader: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  input: { flex: 1, ...typography.body, paddingVertical: 0 },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
  },
  filterBtnText: { ...typography.caption, color: colors.brand.primary, fontWeight: '800' },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: colors.text.onPrimary, fontSize: 11, fontWeight: '800' },
  filterHint: { flex: 1, ...typography.caption, color: colors.text.hint, fontWeight: '600' },
  activeRow: { gap: spacing.sm, alignItems: 'center', paddingRight: spacing.md },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  activeChipText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  list: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', gap: GUTTER, marginBottom: GUTTER },

  // Landing (empty state)
  landing: { flex: 1 },
  landingContent: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  section: { marginBottom: spacing.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...typography.bodyStrong, color: colors.text.primary },
  clearAll: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    height: 38,
    maxWidth: SCREEN_W * 0.6,
  },
  historyChipMain: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  historyChipText: { ...typography.bodySmall, color: colors.text.primary, fontWeight: '600', flexShrink: 1 },
  historyX: { paddingLeft: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  catChipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '700' },
});
