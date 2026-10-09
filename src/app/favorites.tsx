import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Heart, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FavoriteProductRow } from '@/components/favorites/FavoriteProductRow';
import { FavoriteShopRow } from '@/components/favorites/FavoriteShopRow';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { PublicProductVariant, PublicShop } from '@/lib/types';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Favorites {
  shopIds: string[];
  productIds: string[];
}

export default function FavoritesScreen() {
  const { tr } = useTranslation();
  const qc = useQueryClient();

  const favsQ = useQuery<Favorites>({
    queryKey: ['favorites'],
    queryFn: async () => (await api.get('/users/me/favorites')).data,
  });

  const shopsQ = useQuery<PublicShop[]>({
    queryKey: ['favorite-shops', favsQ.data?.shopIds],
    queryFn: async () => {
      const ids = favsQ.data?.shopIds ?? [];
      if (ids.length === 0) return [];
      const res = await Promise.all(
        ids.map((id) => api.get<PublicShop>(`/shops/${id}`).catch(() => null)),
      );
      return res.filter(Boolean).map((r) => r!.data);
    },
    enabled: !!favsQ.data,
  });

  const productsQ = useQuery<PublicProductVariant[]>({
    queryKey: ['favorite-products', favsQ.data?.productIds],
    queryFn: async () => {
      const ids = favsQ.data?.productIds ?? [];
      if (ids.length === 0) return [];
      const res = await Promise.all(
        ids.map((id) =>
          api.get<PublicProductVariant>(`/catalog/products/${id}`).catch(() => null),
        ),
      );
      return res.filter(Boolean).map((r) => r!.data);
    },
    enabled: !!favsQ.data,
  });

  const unfavShop = useMutation({
    mutationFn: (shopId: string) => api.delete(`/users/me/favorites/shops/${shopId}`),
    onSuccess: () => {
      haptics.light();
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const unfavProduct = useMutation({
    mutationFn: (productId: string) =>
      api.delete(`/users/me/favorites/products/${productId}`),
    onSuccess: () => {
      haptics.light();
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const shops = shopsQ.data ?? [];
  const products = productsQ.data ?? [];
  const loading = favsQ.isLoading;
  const hasShops = shops.length > 0;
  const hasProducts = products.length > 0;
  const isEmpty = !loading && !hasShops && !hasProducts;

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['favorites'] });
    qc.invalidateQueries({ queryKey: ['favorite-shops'] });
    qc.invalidateQueries({ queryKey: ['favorite-products'] });
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: isEmpty ? 'center' : 'flex-start', gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={favsQ.isFetching && !favsQ.isLoading}
            onRefresh={handleRefresh}
            colors={[colors.brand.primary]}
            tintColor={colors.brand.primary}
          />
        }>
        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand.primary} />
          </View>
        ) : isEmpty ? (
          <View className="items-center justify-center py-10 px-6">
            <View className="w-20 h-20 rounded-full bg-brand-primary/10 items-center justify-center mb-4">
              <Heart size={44} color={colors.brand.primary} strokeWidth={1.8} />
            </View>
            <Text className="text-xl font-bold text-text-primary mb-1 text-center">{tr('fav.emptyTitle')}</Text>
            <Text className="text-sm text-text-secondary text-center leading-5 mb-6">{tr('fav.emptySub')}</Text>
            <Pressable
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary px-6"
              onPress={() => {
                haptics.medium();
                router.replace('/(tabs)');
              }}>
              <ShoppingBag size={18} color={colors.text.onPrimary} strokeWidth={2.2} />
              <Text className="text-base font-bold text-white">{tr('fav.exploreAction')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Shops Section */}
            {hasShops && (
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-text-primary">{tr('fav.shops')}</Text>
                  <Text className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                    {shops.length}
                  </Text>
                </View>
                <View className="gap-2.5">
                  {shops.map((shop) => (
                    <FavoriteShopRow key={shop.id} shop={shop} onUnfav={() => unfavShop.mutate(shop.id)} />
                  ))}
                </View>
              </View>
            )}

            {/* Products Section */}
            {hasProducts && (
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-text-primary">{tr('fav.products')}</Text>
                  <Text className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                    {products.length}
                  </Text>
                </View>
                <View className="gap-2.5">
                  {products.map((product) => (
                    <FavoriteProductRow
                      key={product.id}
                      product={product}
                      onUnfav={() => unfavProduct.mutate(product.id)}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
