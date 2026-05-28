import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Search as SearchIcon, SlidersHorizontal, Tag, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { Category, FeedProduct, FeedResponse, FeedSort } from '@/lib/types';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, radius, spacing, typography } from '@/theme';

const SCREEN_W = Dimensions.get('window').width;
const COLUMNS = 2;
const GUTTER = spacing.md;
const CARD_WIDTH = (SCREEN_W - layout.screenPadding * 2 - GUTTER) / COLUMNS;

const SORTS: { key: FeedSort; label: string }[] = [
  { key: 'relevance', label: 'Mashhur' },
  { key: 'price_asc', label: 'Arzon' },
  { key: 'price_desc', label: 'Qimmat' },
  { key: 'rating', label: 'Reyting' },
];

export default function SearchTab() {
  const coords = useEffectiveCoords();
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<FeedSort>('relevance');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);

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

  const feed = useInfiniteQuery({
    queryKey: ['search-feed', coords?.latitude, coords?.longitude, q, categoryId, sort, onlyDiscounted],
    queryFn: async ({ pageParam }) => {
      if (!coords) return { items: [], nextPage: null } satisfies FeedResponse;
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: {
          lat: coords.latitude,
          lng: coords.longitude,
          page: pageParam,
          limit: 24,
          q: q || undefined,
          categoryId: categoryId || undefined,
          sort,
          onlyDiscounted: onlyDiscounted || undefined,
        },
      });
      return res.data;
    },
    enabled: !!coords,
    initialPageParam: 1 as number,
    getNextPageParam: (last) => last.nextPage,
  });

  const items = useMemo<FeedProduct[]>(
    () => feed.data?.pages.flatMap((p) => p.items) ?? [],
    [feed.data],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <SearchIcon size={18} color={colors.text.tertiary} strokeWidth={2.4} />
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Mahsulot qidirish…"
            placeholderTextColor={colors.text.hint}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {input.length > 0 && (
            <Pressable onPress={() => setInput('')} hitSlop={8}>
              <X size={18} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          <Chip label="Hammasi" active={categoryId === null} onPress={() => setCategoryId(null)} />
          {leafCategories.map((c) => (
            <Chip
              key={c.id}
              label={c.nameUzLatn}
              active={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          <View style={styles.sortIcon}>
            <SlidersHorizontal size={14} color={colors.text.tertiary} strokeWidth={2.4} />
          </View>
          {SORTS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              active={sort === s.key}
              onPress={() => setSort(s.key)}
              small
            />
          ))}
          <Chip
            label="Chegirmali"
            icon={<Tag size={12} color={onlyDiscounted ? colors.text.onPrimary : colors.brand.primary} strokeWidth={2.6} />}
            active={onlyDiscounted}
            onPress={() => setOnlyDiscounted((v) => !v)}
            small
            tone="accent"
          />
        </ScrollView>
      </View>

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
          feed.isLoading ? (
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
              title="Mahsulot topilmadi"
              description="Boshqa kalit so‘z yoki filtrlarni sinab ko‘ring"
            />
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand.primary} style={{ paddingVertical: spacing.lg }} />
          ) : null
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            cardWidth={CARD_WIDTH}
            onPress={() => router.push(`/product/${item.id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

interface ChipProps {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
  readonly small?: boolean;
  readonly tone?: 'default' | 'accent';
  readonly icon?: React.ReactNode;
}
function Chip({ label, active, onPress, small, icon }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        small && styles.chipSmall,
        active && styles.chipActive,
      ]}>
      {icon}
      <Text style={[styles.chipText, small && styles.chipTextSmall, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
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
  filters: {
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chipRow: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
    alignItems: 'center',
  },
  sortIcon: { paddingRight: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  chipSmall: { paddingVertical: 6, paddingHorizontal: spacing.sm },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '700' },
  chipTextSmall: { fontSize: 12 },
  chipTextActive: { color: colors.text.onPrimary },
  list: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: spacing['3xl'] },
  row: { gap: GUTTER, marginBottom: GUTTER },
});
