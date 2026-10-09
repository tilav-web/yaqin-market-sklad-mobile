import { router } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
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

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onEndReached) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 250;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      onEndReached();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomInset + 85 }}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={activeColors.brand.primary}
        />
      }
    >
      {headerComponent}

      {products.length === 0 ? (
        isLoading ? (
          <ProductGridSkeleton cardWidth={cardWidth} count={6} />
        ) : (
          <View className="pt-16 items-center justify-center">
            <EmptyState
              icon={ShoppingBag}
              title={emptyTitle}
              description={emptyDescription}
            />
          </View>
        )
      ) : (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: 14,
            gap: 10,
          }}
        >
          {products.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              cardWidth={cardWidth}
              onPress={() => router.push(`/product/${item.id}` as never)}
            />
          ))}
        </View>
      )}

      {isFetchingNextPage ? (
        <View className="py-4 items-center justify-center">
          <ActivityIndicator size="small" color={activeColors.brand.primary} />
        </View>
      ) : null}
    </ScrollView>
  );
}
