import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronDown, Map as MapIcon, MapPin, Search as SearchIcon, ShoppingBag } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { StoreFeedCard } from '@/components/StoreFeedCard';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

const SCREEN_W = Dimensions.get('window').width;
const GUTTER = spacing.sm;
const SIDE = layout.screenPadding;
const CARD_WIDTH = (SCREEN_W - SIDE * 2 - GUTTER) / 2;

// Insert a shop card after every N product rows (each row = 2 products).
const STORE_EVERY_ROWS = 4;

type Row =
  | { readonly kind: 'products'; readonly items: FeedProduct[] }
  | { readonly kind: 'store'; readonly shop: PublicShop };

export default function HomeScreen() {
  const { tr } = useTranslation();
  const coords = useEffectiveCoords();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refresh = useLocationStore((s) => s.refresh);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);

  useEffect(() => {
    if (!permissionStatus) {
      void requestPermission().then(() => refresh());
    } else if (permissionStatus === 'granted' && !coords) {
      void refresh();
    }
  }, [permissionStatus, coords, requestPermission, refresh]);

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

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', coords?.latitude, coords?.longitude],
    queryFn: async ({ pageParam }) => {
      if (!coords) return { items: [], nextPage: null } satisfies FeedResponse;
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: { lat: coords.latitude, lng: coords.longitude, page: pageParam, limit: 24 },
      });
      return res.data;
    },
    enabled: !!coords,
    initialPageParam: 1 as number,
    getNextPageParam: (last) => last.nextPage,
  });

  const items = useMemo<FeedProduct[]>(
    () => feedQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [feedQuery.data],
  );

  // Build interleaved rows: 2 products per row, a shop card every few rows.
  const rows = useMemo<Row[]>(() => {
    const shops = shopsQuery.data ?? [];
    const out: Row[] = [];
    let shopIdx = 0;
    for (let i = 0; i < items.length; i += 2) {
      out.push({ kind: 'products', items: items.slice(i, i + 2) });
      if (out.length % STORE_EVERY_ROWS === 0 && shopIdx < shops.length) {
        out.push({ kind: 'store', shop: shops[shopIdx++] });
      }
    }
    // Surface any remaining shops at the end so all nearby shops are reachable.
    while (shopIdx < shops.length) {
      out.push({ kind: 'store', shop: shops[shopIdx++] });
    }
    return out;
  }, [items, shopsQuery.data]);

  const isInitialLoading =
    (feedQuery.isLoading && items.length === 0) || (!coords && !!permissionStatus);

  const locationLabel = selectedAddress
    ? selectedAddress.label
    : coords
      ? tr('home.currentLocation')
      : tr('home.locationLoading');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Red header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.brand}>Yaqin Market</Text>
          <Pressable
            style={styles.locationPill}
            onPress={() => router.push('/addresses')}>
            <MapPin size={13} color={colors.text.onPrimary} strokeWidth={2.4} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <ChevronDown size={13} color="rgba(255,255,255,0.85)" strokeWidth={2.4} />
          </Pressable>
        </View>

        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <SearchIcon size={18} color={colors.text.tertiary} strokeWidth={2.4} />
          <Text style={styles.searchPlaceholder}>{tr('search.placeholder')}</Text>
          <Pressable style={styles.mapBtn} onPress={() => router.push('/map')}>
            <MapIcon size={16} color={colors.brand.primary} strokeWidth={2.4} />
          </Pressable>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row, idx) => (row.kind === 'store' ? `s-${row.shop.id}` : `p-${idx}`)}
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: GUTTER }} />}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isFetching && !feedQuery.isFetchingNextPage && !isInitialLoading}
            onRefresh={() => {
              void refresh();
              void feedQuery.refetch();
              void shopsQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
            void feedQuery.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={{ gap: GUTTER }}>
              {[0, 1, 2].map((r) => (
                <View key={r} style={styles.skeletonRow}>
                  <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                  <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={coords ? ShoppingBag : MapPin}
              title={coords ? tr('home.empty.title') : tr('home.locationLoading')}
              description={tr('home.empty.desc')}
              actionLabel={coords ? undefined : tr('home.locationRetry')}
              onAction={coords ? undefined : () => void refresh()}
            />
          )
        }
        ListFooterComponent={
          feedQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand.primary} style={{ paddingVertical: spacing.lg }} />
          ) : null
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'store') {
            return (
              <StoreFeedCard
                shop={row.shop}
                onPress={() => router.push(`/shop/${row.shop.id}`)}
              />
            );
          }
          return (
            <View style={styles.productRow}>
              {row.items.map((product) => (
                <View key={product.id} style={styles.cell}>
                  <ProductCard
                    product={product}
                    cardWidth={CARD_WIDTH}
                    onPress={() => router.push(`/product/${product.id}`)}
                  />
                </View>
              ))}
              {row.items.length === 1 && <View style={styles.cell} />}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brand.primary },
  header: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    gap: spacing.md,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { ...typography.h3, color: colors.text.onPrimary, flexShrink: 0 },
  locationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  locationText: { flex: 1, ...typography.caption, color: colors.text.onPrimary, fontWeight: '600' },
  searchBar: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  searchPlaceholder: { flex: 1, ...typography.body, color: colors.text.hint },
  mapBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, backgroundColor: colors.bg.canvas },
  list: {
    padding: layout.screenPadding,
    paddingBottom: spacing['3xl'],
  },
  skeletonRow: { flexDirection: 'row', gap: GUTTER },
  productRow: { flexDirection: 'row', gap: GUTTER },
  cell: { flex: 1 },
});
