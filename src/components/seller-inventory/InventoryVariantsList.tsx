import { Package } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { SellerVariant } from '@/lib/types';
import { colors } from '@/theme';

import { InventoryCard } from './InventoryCard';

interface InventoryVariantsListProps {
  variants: SellerVariant[];
  search: string;
  isOwner?: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage?: boolean;
  onRefresh: () => void;
  onFetchNextPage: () => void;
  onEdit: (v: SellerVariant) => void;
  onMenu: (v: SellerVariant) => void;
  onAdjust: (variantId: string, delta: number) => void;
  onHistory: (v: SellerVariant) => void;
  onDelete: (v: SellerVariant) => void;
  onKirim: (v: SellerVariant) => void;
}

export function InventoryVariantsList({
  variants,
  search,
  isOwner,
  isFetching,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onRefresh,
  onFetchNextPage,
  onEdit,
  onMenu,
  onAdjust,
  onHistory,
  onDelete,
  onKirim,
}: InventoryVariantsListProps) {
  return (
    <FlatList
      data={variants}
      keyExtractor={(v) => v.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading && !isFetchingNextPage}
          onRefresh={onRefresh}
          tintColor={colors.brand.primary}
          colors={[colors.brand.primary]}
        />
      }
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          onFetchNextPage();
        }
      }}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator color={colors.brand.primary} className="my-4" />
        ) : null
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={colors.brand.primary} className="mt-10" />
        ) : (
          <View className="py-16 items-center gap-2">
            <View className="w-16 h-16 rounded-full bg-brand-primary-surface items-center justify-center">
              <Package size={28} color={colors.brand.primary} strokeWidth={1.8} />
            </View>
            <Text className="text-lg font-bold text-text-primary">
              {search ? tr('inv.notFound') : tr('inv.emptyTitle')}
            </Text>
            <Text className="text-sm text-text-secondary text-center">
              {search ? tr('inv.notFoundHint') : tr('inv.emptyHint')}
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <InventoryCard
          item={item}
          isOwner={isOwner}
          onEdit={onEdit}
          onMenu={onMenu}
          onAdjust={onAdjust}
          onHistory={onHistory}
          onDelete={onDelete}
          onKirim={onKirim}
        />
      )}
    />
  );
}
