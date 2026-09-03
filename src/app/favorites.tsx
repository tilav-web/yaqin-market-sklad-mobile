import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Heart, Package, ShoppingBag, Store } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { PublicProductVariant, PublicShop } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isEmpty && styles.scrollEmpty]}
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
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
          </View>
        ) : isEmpty ? (
          <View style={styles.unifiedEmptyBox}>
            <View style={styles.emptyIconCircle}>
              <Heart size={44} color={colors.brand.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>{tr('fav.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{tr('fav.emptySub')}</Text>
            <Pressable
              style={styles.exploreBtn}
              onPress={() => {
                haptics.medium();
                router.replace('/(tabs)');
              }}>
              <ShoppingBag size={18} color={colors.text.onPrimary} strokeWidth={2.2} />
              <Text style={styles.exploreBtnText}>{tr('fav.exploreAction')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Shops Section (only rendered if shops exist) */}
            {hasShops && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.title}>{tr('fav.shops')}</Text>
                  <Text style={styles.countBadge}>{shops.length}</Text>
                </View>
                <View style={styles.cardsList}>
                  {shops.map((shop) => (
                    <Pressable
                      key={shop.id}
                      style={({ pressed }) => [
                        styles.shopRow,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                      ]}
                      onPress={() => router.push(`/shop/${shop.id}`)}>
                      <View style={styles.shopIcon}>
                        <Store size={22} color={colors.brand.primary} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shopName} numberOfLines={1}>
                          {shop.name}
                        </Text>
                        <Text style={styles.shopAddr} numberOfLines={1}>
                          {shop.address}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={12}
                        onPress={() => unfavShop.mutate(shop.id)}
                        style={styles.heartBtn}>
                        <Heart
                          size={22}
                          color={colors.brand.primary}
                          fill={colors.brand.primary}
                          strokeWidth={0}
                        />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Products Section (only rendered if products exist) */}
            {hasProducts && (
              <View style={[styles.section, hasShops && { marginTop: spacing.md }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.title}>{tr('fav.products')}</Text>
                  <Text style={styles.countBadge}>{products.length}</Text>
                </View>
                <View style={styles.cardsList}>
                  {products.map((product) => (
                    <Pressable
                      key={product.id}
                      style={({ pressed }) => [
                        styles.shopRow,
                        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                      ]}
                      onPress={() => router.push(`/product/${product.id}`)}>
                      <View style={styles.productIcon}>
                        <Package size={22} color={colors.brand.primary} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shopName} numberOfLines={1}>
                          {getLocalizedText(product.name)}
                        </Text>
                        <Text style={styles.priceTag} numberOfLines={1}>
                          {product.discountPrice
                            ? `${product.discountPrice.toLocaleString()} so'm`
                            : `${product.price.toLocaleString()} so'm`}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={12}
                        onPress={() => unfavProduct.mutate(product.id)}
                        style={styles.heartBtn}>
                        <Heart
                          size={22}
                          color={colors.brand.primary}
                          fill={colors.brand.primary}
                          strokeWidth={0}
                        />
                      </Pressable>
                    </Pressable>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  scrollEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingBox: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  unifiedEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: spacing.md,
  },
  exploreBtn: {
    height: layout.buttonHeight.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.xl,
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.sm,
  },
  exploreBtnText: {
    ...typography.button,
    color: colors.text.onPrimary,
    fontWeight: '700',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '800',
  },
  countBadge: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  cardsList: {
    gap: spacing.sm,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  shopIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    ...typography.bodyStrong,
    color: colors.text.primary,
    fontWeight: '700',
  },
  shopAddr: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  priceTag: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  heartBtn: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
