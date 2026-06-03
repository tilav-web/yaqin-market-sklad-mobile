import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronDown, Map as MapIcon, MapPin, Navigation, Search as SearchIcon, ShoppingBag } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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

import { AddressPickerSheet } from '@/components/AddressPickerSheet';
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

  const [pickerOpen, setPickerOpen] = useState(false);

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

  // Build interleaved rows: 2 products per row, a shop card after every few
  // PRODUCT rows. Shop placement is keyed to the product-row index (not the
  // mixed output length), so already-rendered rows never shift when a new feed
  // page arrives. No shops are shown before products exist (avoids the
  // "shops flash first, then get replaced" jump), and any shops that didn't
  // fit are appended only once the feed is fully loaded.
  const rows = useMemo<Row[]>(() => {
    if (items.length === 0) return [];
    // Closed shops are hidden from the feed (their products are filtered out
    // server-side, so showing their banner would be misleading).
    const shops = (shopsQuery.data ?? []).filter((s) => s.isOpenManual);
    const out: Row[] = [];
    let shopIdx = 0;
    let productRows = 0;
    for (let i = 0; i < items.length; i += 2) {
      out.push({ kind: 'products', items: items.slice(i, i + 2) });
      productRows++;
      if (productRows % STORE_EVERY_ROWS === 0 && shopIdx < shops.length) {
        out.push({ kind: 'store', shop: shops[shopIdx++] });
      }
    }
    if (!feedQuery.hasNextPage) {
      while (shopIdx < shops.length) {
        out.push({ kind: 'store', shop: shops[shopIdx++] });
      }
    }
    return out;
  }, [items, shopsQuery.data, feedQuery.hasNextPage]);

  const isInitialLoading =
    (feedQuery.isLoading && items.length === 0) || (!coords && !!permissionStatus);

  const locationLabel = selectedAddress
    ? selectedAddress.label
    : coords
      ? tr('home.currentLocation')
      : tr('home.locationLoading');
  // A manually picked saved address is NOT the device's live position. Surface
  // this strongly so the customer never browses the wrong area by accident.
  const usingManualAddress = !!selectedAddress;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Red header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.brand}>Yaqin Market</Text>
          <Pressable
            style={[styles.locationPill, usingManualAddress && styles.locationPillManual]}
            onPress={() => setPickerOpen(true)}>
            {usingManualAddress ? (
              <MapPin
                size={15}
                color={colors.brand.primary}
                strokeWidth={2.6}
                fill={colors.brand.primarySurface}
              />
            ) : (
              <Navigation size={13} color={colors.text.onPrimary} strokeWidth={2.4} />
            )}
            <View style={styles.locationTextWrap}>
              <Text
                style={[styles.locationText, usingManualAddress && styles.locationTextManual]}
                numberOfLines={1}>
                {locationLabel}
              </Text>
              {usingManualAddress && (
                <Text style={styles.locationSub} numberOfLines={1}>
                  {tr('home.notCurrentLocation')}
                </Text>
              )}
            </View>
            <ChevronDown
              size={14}
              color={usingManualAddress ? colors.text.tertiary : 'rgba(255,255,255,0.85)'}
              strokeWidth={2.4}
            />
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

      <AddressPickerSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
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
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  // Manual address = NOT live GPS: solid white pill with an amber alert border
  // so it visibly stands out against the red header.
  locationPillManual: {
    backgroundColor: colors.bg.surface,
    borderColor: colors.feedback.warning,
    borderWidth: 1.5,
    paddingVertical: 5,
  },
  locationTextWrap: { flex: 1 },
  locationText: { ...typography.caption, color: colors.text.onPrimary, fontWeight: '600' },
  locationTextManual: { color: colors.text.primary, fontWeight: '700' },
  locationSub: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    color: colors.feedback.warning,
  },
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
