import { router } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

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
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.gridColumnWrapper}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          cardWidth={cardWidth}
          onPress={() => router.push(`/product/${item.id}` as never)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.gridSeparator} />}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 85 }]}
      ListHeaderComponent={headerComponent}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={activeColors.brand.primary} />
          </View>
        ) : (
          <View style={styles.centerLoading}>
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
          <View style={styles.footerLoading}>
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

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 4,
  },
  gridColumnWrapper: {
    paddingHorizontal: 14,
    gap: 10,
  },
  gridSeparator: {
    height: 10,
  },
  centerLoading: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
