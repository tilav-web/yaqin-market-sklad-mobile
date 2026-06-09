import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Heart, Package, Store } from 'lucide-react-native';
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

import { api, resolveMedia } from '@/lib/api';
import { PublicProductVariant, PublicShop } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Favorites { shopIds: string[]; productIds: string[] }

export default function FavoritesScreen() {
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
      const res = await Promise.all(ids.map((id) => api.get<PublicShop>(`/shops/${id}`).catch(() => null)));
      return res.filter(Boolean).map((r) => r!.data);
    },
    enabled: !!favsQ.data,
  });

  const productsQ = useQuery<PublicProductVariant[]>({
    queryKey: ['favorite-products', favsQ.data?.productIds],
    queryFn: async () => {
      const ids = favsQ.data?.productIds ?? [];
      if (ids.length === 0) return [];
      const res = await Promise.all(ids.map((id) => api.get<PublicProductVariant>(`/catalog/products/${id}`).catch(() => null)));
      return res.filter(Boolean).map((r) => r!.data);
    },
    enabled: !!favsQ.data,
  });

  const unfavShop = useMutation({
    mutationFn: (shopId: string) => api.delete(`/users/me/favorites/shops/${shopId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const unfavProduct = useMutation({
    mutationFn: (productId: string) => api.delete(`/users/me/favorites/products/${productId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const shops = shopsQ.data ?? [];
  const products = productsQ.data ?? [];
  const loading = favsQ.isLoading;

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['favorites'] });
    qc.invalidateQueries({ queryKey: ['favorite-shops'] });
    qc.invalidateQueries({ queryKey: ['favorite-products'] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={favsQ.isFetching && !favsQ.isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Shops */}
        <Text style={styles.title}>Sevimli do'konlar</Text>

        {loading ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 24 }} />
        ) : shops.length === 0 ? (
          <View style={styles.empty}>
            <Store size={32} color={colors.border.default} strokeWidth={1.5} />
            <Text style={styles.emptyText}>Hali sevimli do'konlar yo'q</Text>
          </View>
        ) : (
          shops.map((shop) => (
            <Pressable
              key={shop.id}
              style={({ pressed }) => [styles.shopRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/shop/${shop.id}`)}
            >
              <View style={styles.shopIcon}>
                <Store size={22} color={colors.brand.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                <Text style={styles.shopAddr} numberOfLines={1}>{shop.address}</Text>
              </View>
              <Pressable hitSlop={12} onPress={() => { haptics.medium(); unfavShop.mutate(shop.id); }} style={styles.heartBtn}>
                <Heart size={20} color={colors.brand.primary} fill={colors.brand.primary} strokeWidth={0} />
              </Pressable>
            </Pressable>
          ))
        )}

        {/* Products */}
        <Text style={[styles.title, { marginTop: spacing.xl }]}>Sevimli mahsulotlar</Text>

        {loading ? null : products.length === 0 ? (
          <View style={styles.empty}>
            <Package size={32} color={colors.border.default} strokeWidth={1.5} />
            <Text style={styles.emptyText}>Hali sevimli mahsulotlar yo'q</Text>
          </View>
        ) : (
          products.map((product) => (
            <Pressable
              key={product.id}
              style={({ pressed }) => [styles.shopRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/product/${product.id}`)}
            >
              <View style={styles.shopIcon}>
                <Package size={22} color={colors.brand.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.shopAddr} numberOfLines={1}>
                  {product.discountPrice
                    ? `${product.discountPrice.toLocaleString()} so'm`
                    : `${product.price.toLocaleString()} so'm`}
                </Text>
              </View>
              <Pressable hitSlop={12} onPress={() => { haptics.medium(); unfavProduct.mutate(product.id); }} style={styles.heartBtn}>
                <Heart size={20} color={colors.brand.primary} fill={colors.brand.primary} strokeWidth={0} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, paddingBottom: spacing['3xl'], gap: spacing.xs },
  title: { ...typography.h3, color: colors.text.primary, marginBottom: spacing.xs },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  shopIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...typography.bodyStrong, color: colors.text.primary },
  shopAddr: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  heartBtn: { padding: spacing.xs },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing['3xl'] },
  emptyText: { ...typography.bodyStrong, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary },
});
