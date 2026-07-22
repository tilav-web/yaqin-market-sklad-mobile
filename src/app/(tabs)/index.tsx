import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { ChevronDown, Map as MapIcon, MapPin, Navigation, Search as SearchIcon, ShoppingBag, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressPickerSheet } from '@/components/AddressPickerSheet';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { StoreFeedCard } from '@/components/StoreFeedCard';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { hideProgress } from '@/stores/scrollHide';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

// How far (in px) the list must scroll continuously in one direction before
// the tab bar / sticky header commit to hiding or showing — small enough to
// feel responsive, large enough to ignore bounce/rubber-band jitter.
const HIDE_AFTER_PX = 40;
const SHOW_AFTER_PX = 16;

const SCREEN_W = Dimensions.get('window').width;
const GUTTER = spacing.sm;
const SIDE = layout.screenPadding;
const CARD_WIDTH = (SCREEN_W - SIDE * 2 - GUTTER) / 2;

// Insert a shop card after every N product rows (each row = 2 products).
const STORE_EVERY_ROWS = 4;

type Row =
  | { readonly kind: 'products'; readonly items: FeedProduct[] }
  | { readonly kind: 'store'; readonly shop: PublicShop };

interface HomeHeaderCardProps {
  readonly tr: ReturnType<typeof useTranslation>['tr'];
  readonly usingManualAddress: boolean;
  readonly locationLabel: string;
  readonly onPressLocation: () => void;
  readonly onPressSearch: () => void;
  readonly onPressMap: () => void;
}

// Shared visual for both the header's natural place at the top of the feed
// AND its floating "reveal on scroll up" copy — so the two read as the same
// element sliding, not two different-looking headers swapping places.
function HomeHeaderCard({
  tr,
  usingManualAddress,
  locationLabel,
  onPressLocation,
  onPressSearch,
  onPressMap,
}: HomeHeaderCardProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>Yaqin Market</Text>
        </View>
        <Pressable
          style={[styles.locationPill, usingManualAddress && styles.locationPillManual]}
          onPress={onPressLocation}>
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

      <Pressable style={styles.searchBar} onPress={onPressSearch}>
        <SearchIcon size={18} color={colors.text.tertiary} strokeWidth={2.4} />
        <Text style={styles.searchPlaceholder}>{tr('search.placeholder')}</Text>
        <Pressable style={styles.mapBtn} onPress={onPressMap}>
          <MapIcon size={16} color={colors.brand.primary} strokeWidth={2.4} />
        </Pressable>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const { tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const coords = useEffectiveCoords();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const requestPermission = useLocationStore((s) => s.requestPermission);
  const refresh = useLocationStore((s) => s.refresh);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // The header lives naturally at the top of the feed (scrolls away with it
  // like any other content). `stickyProgress` drives a second, floating copy
  // that slides down only once the natural header has scrolled out of view
  // and the user scrolls back up — and slides away again near the very top,
  // where the natural header is already back on screen.
  const stickyProgress = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const scrollDir = useSharedValue(0);
  const scrollAccum = useSharedValue(0);
  const onFeedScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = Math.max(0, event.contentOffset.y);
      const delta = y - lastScrollY.value;
      lastScrollY.value = y;

      // The instant any sliver of the natural header is scrolling back into
      // view, the floating copy must already be gone — otherwise the two
      // visibly overlap for a moment.
      if (y <= headerHeight + GUTTER) {
        scrollAccum.value = 0;
        scrollDir.value = 0;
        hideProgress.value = withTiming(0, { duration: 200 });
        stickyProgress.value = withTiming(0, { duration: 200 });
        return;
      }
      if (Math.abs(delta) < 1) return;

      const dir = delta > 0 ? 1 : -1;
      if (dir !== scrollDir.value) {
        scrollDir.value = dir;
        scrollAccum.value = 0;
      }
      scrollAccum.value += Math.abs(delta);

      if (dir === 1 && scrollAccum.value > HIDE_AFTER_PX) {
        hideProgress.value = withTiming(1, { duration: 220 });
        stickyProgress.value = withTiming(0, { duration: 220 });
      } else if (dir === -1 && scrollAccum.value > SHOW_AFTER_PX) {
        hideProgress.value = withTiming(0, { duration: 220 });
        stickyProgress.value = withTiming(1, { duration: 220 });
      }
    },
  });
  const stickyHeaderStyle = useAnimatedStyle(() => {
    const hiddenDistance = insets.top + layout.screenPadding + headerHeight + 16;
    return { transform: [{ translateY: (stickyProgress.value - 1) * hiddenDistance }] };
  });

  // Leaving the home tab (e.g. via the Telegram-style tab swipe) must never
  // strand the tab bar hidden, or the sticky header stuck visible, on
  // another screen that doesn't scroll them back into their default state.
  useFocusEffect(
    useCallback(() => {
      return () => {
        hideProgress.value = withTiming(0, { duration: 200 });
        stickyProgress.value = withTiming(0, { duration: 200 });
      };
    }, [stickyProgress]),
  );

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
      <Animated.FlatList
        data={rows}
        keyExtractor={(row: Row, idx: number) => (row.kind === 'store' ? `s-${row.shop.id}` : `p-${idx}`)}
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={onFeedScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={styles.listHeaderWrap} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
            <HomeHeaderCard
              tr={tr}
              usingManualAddress={usingManualAddress}
              locationLabel={locationLabel}
              onPressLocation={() => setPickerOpen(true)}
              onPressSearch={() => router.push('/search')}
              onPressMap={() => router.push('/map')}
            />
          </View>
        }
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
          ) : feedQuery.isError ? (
            <EmptyState
              icon={WifiOff}
              title={tr('common.error.title')}
              description={tr('common.error.desc')}
              actionLabel={tr('common.retry')}
              onAction={() => void feedQuery.refetch()}
            />
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

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.stickyHeaderContainer,
          { paddingTop: insets.top + layout.screenPadding },
          stickyHeaderStyle,
        ]}>
        <HomeHeaderCard
          tr={tr}
          usingManualAddress={usingManualAddress}
          locationLabel={locationLabel}
          onPressLocation={() => setPickerOpen(true)}
          onPressSearch={() => router.push('/search')}
          onPressMap={() => router.push('/map')}
        />
      </Animated.View>

      <AddressPickerSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  // Wraps the header's natural place at the top of the feed — margin-bottom
  // matches the gap between every other row so it reads as one consistent
  // rhythm, not a specially-spaced banner.
  listHeaderWrap: { marginBottom: GUTTER },
  // The floating "reveal on scroll up" copy — transparent shell so sliding it
  // away never leaves a colored gap; width/margins mirror the list's own
  // horizontal padding so the card doesn't visibly resize between the two.
  stickyHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: layout.screenPadding,
  },
  // The floating card look: bordered and fully rounded like the tab bar, so
  // it reads as one consistent floating-chrome language.
  header: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
    ...shadow.lg,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
