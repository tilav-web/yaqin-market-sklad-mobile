import { router } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/ui';
import { FeedProduct } from '@/lib/types';
import { useTheme } from '@/stores/theme';

interface HomeProductGridProps {
  products: FeedProduct[];
  cardWidth: number;
  isLoading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  isRefetching: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  bottomInset: number;
  headerComponent?: React.ReactElement | null;
}

export function HomeProductGrid({
  products,
  cardWidth,
  isLoading,
  emptyTitle,
  emptyDescription,
  isRefetching,
  onRefresh,
  onEndReached,
  isFetchingNextPage,
  bottomInset,
  headerComponent,
}: HomeProductGridProps) {
  const { colors: activeColors } = useTheme();

  return (
    <FlatList
      key="home-grid-2col"
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ paddingHorizontal: 14, gap: 10 }}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          cardWidth={cardWidth}
          onPress={() => router.push(`/product/${item.id}` as never)}
        />
      )}
      ItemSeparatorComponent={() => <View className="h-2.5" />}
      contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomInset + 85 }}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={
        isLoading ? (
          <View className="pt-16 items-center justify-center">
            <ActivityIndicator size="large" color={activeColors.brand.primary} />
          </View>
        ) : (
          <View className="pt-16 items-center justify-center">
            <EmptyState
              icon={ShoppingBag}
              title={emptyTitle}
              description={emptyDescription}
            />
          </View>
        )
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="py-4 items-center justify-center">
            <ActivityIndicator size="small" color={activeColors.brand.primary} />
          </View>
        ) : null
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={activeColors.brand.primary}
        />
      }
    />
  );
}
