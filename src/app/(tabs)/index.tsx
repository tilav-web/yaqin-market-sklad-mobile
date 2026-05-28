import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, MapPin, ShoppingBag } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationHeader } from '@/components/LocationHeader';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, spacing, typography } from '@/theme';

const SCREEN_W = Dimensions.get('window').width;
const COLUMNS = 2;
const GUTTER = spacing.md;
const CARD_WIDTH = (SCREEN_W - layout.screenPadding * 2 - GUTTER) / COLUMNS;

export default function HomeScreen() {
  const { tr } = useTranslation();
  const coords = useEffectiveCoords();
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

  const isInitialLoading = (feedQuery.isLoading && items.length === 0) || (!coords && !!permissionStatus);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>Yaqin Market</Text>
        <LocationHeader onPress={() => router.push('/addresses')} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
        ListHeaderComponent={
          <ShopsRail shops={shopsQuery.data ?? []} loading={shopsQuery.isLoading && !!coords} />
        }
        ListEmptyComponent={
          isInitialLoading ? (
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

interface ShopsRailProps {
  readonly shops: PublicShop[];
  readonly loading: boolean;
}
function ShopsRail({ shops, loading }: ShopsRailProps) {
  const { tr } = useTranslation();

  if (!loading && shops.length === 0) {
    return <Text style={styles.feedHeading}>{tr('shop.products')}</Text>;
  }

  return (
    <View style={styles.rail}>
      <View style={styles.railHeader}>
        <Text style={styles.railTitle}>{tr('home.nearbyShops')}</Text>
        {shops.length > 0 && (
          <Pressable onPress={() => router.push('/shops')} style={styles.railLink}>
            <Text style={styles.railLinkText}>Barchasi</Text>
            <ChevronRight size={14} color={colors.brand.primary} strokeWidth={2.6} />
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railScroll}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.shopChip, styles.shopChipSkeleton]} />
            ))
          : shops.slice(0, 10).map((shop) => (
              <Pressable
                key={shop.id}
                onPress={() => router.push(`/shop/${shop.id}`)}
                style={({ pressed }) => [styles.shopChip, pressed && { opacity: 0.85 }]}>
                <View style={styles.shopAvatar}>
                  <Text style={styles.shopAvatarLetter}>
                    {shop.name[0]?.toUpperCase() ?? '?'}
                  </Text>
                  {!shop.isOpenManual && <View style={styles.closedDot} />}
                </View>
                <Text style={styles.shopChipName} numberOfLines={1}>
                  {shop.name}
                </Text>
                <Text style={styles.shopChipMeta}>{shop.distanceKm?.toFixed(1)} km</Text>
              </Pressable>
            ))}
      </ScrollView>
      <Text style={styles.feedHeading}>{tr('shop.products')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: spacing.sm,
  },
  brand: { ...typography.h2, color: colors.brand.primary },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing['3xl'] },
  row: { gap: GUTTER, marginBottom: GUTTER },
  rail: { marginHorizontal: -layout.screenPadding },
  railHeader: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  railTitle: { ...typography.h4 },
  railLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  railLinkText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  railScroll: { paddingHorizontal: layout.screenPadding, gap: spacing.md, paddingBottom: spacing.xs },
  shopChip: { width: 76, alignItems: 'center', gap: 5 },
  shopChipSkeleton: { height: 100, borderRadius: radius.md, backgroundColor: colors.bg.surfaceMuted },
  shopAvatar: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shopAvatarLetter: { color: colors.text.onPrimary, fontSize: 22, fontWeight: '800' },
  closedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.text.tertiary,
    borderWidth: 2,
    borderColor: colors.bg.surface,
  },
  shopChipName: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  shopChipMeta: { ...typography.caption, fontSize: 10, color: colors.text.secondary },
  feedHeading: {
    ...typography.h4,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
});
