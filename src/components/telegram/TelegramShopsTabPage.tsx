import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { PublicShop } from '@/lib/types';
import { useTheme } from '@/stores/theme';

import { TelegramShopRow } from './TelegramShopRow';
import { TelegramShopsEmpty } from './TelegramShopsEmpty';

interface TelegramShopsTabPageProps {
  isLoadingShops: boolean;
  filteredShops: PublicShop[];
  isRefetchingShops: boolean;
  searchQuery: string;
  activeColors: ReturnType<typeof useTheme>['colors'];
  bottomInset: number;
  onRefresh: () => void;
}

export function TelegramShopsTabPage({
  isLoadingShops,
  filteredShops,
  isRefetchingShops,
  searchQuery,
  activeColors,
  bottomInset,
  onRefresh,
}: TelegramShopsTabPageProps) {
  return (
    <View className="flex-1" style={{ backgroundColor: activeColors.bg.canvas }}>
      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TelegramShopRow shop={item} />}
        ItemSeparatorComponent={() => (
          <View
            className="h-[1px] ml-[82px]"
            style={{ backgroundColor: activeColors.border.subtle }}
          />
        )}
        contentContainerStyle={{ paddingTop: 2, paddingBottom: bottomInset + 90 }}
        ListEmptyComponent={
          isLoadingShops ? (
            <View className="flex-1 items-center justify-center px-8">
              <ActivityIndicator size="large" color={activeColors.brand.primary} />
            </View>
          ) : (
            <TelegramShopsEmpty searchQuery={searchQuery} activeColors={activeColors} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingShops}
            onRefresh={onRefresh}
            tintColor={activeColors.brand.primary}
          />
        }
      />
    </View>
  );
}
