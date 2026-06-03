import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, MapPin, Store, Truck } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/i18n';
import { api, resolveMedia } from '@/lib/api';
import { FeedProduct, PublicProductVariant, PublicShop } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

const SCREEN_W = Dimensions.get('window').width;
const GUTTER = spacing.sm;
const SIDE = layout.screenPadding;
const CARD_WIDTH = (SCREEN_W - SIDE * 2 - GUTTER) / 2;

export default function ShopDetailScreen() {
  const { tr } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const coords = useEffectiveCoords();

  const shopQuery = useQuery({
    queryKey: ['shop', id, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      const res = await api.get<PublicShop>(`/shops/${id}`, {
        params: coords ? { lat: coords.latitude, lng: coords.longitude } : undefined,
      });
      return res.data;
    },
    enabled: !!id,
  });

  const productsQuery = useQuery({
    queryKey: ['shop-products', id],
    queryFn: async () => {
      const res = await api.get<PublicProductVariant[]>(`/catalog/shops/${id}/products`);
      return res.data;
    },
    enabled: !!id,
  });

  const cartLines = useCartStore((s) => s.carts[id ?? ''] ?? EMPTY_CART);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const shop = shopQuery.data;

  // Adapt each variant to the FeedProduct shape ProductCard expects, attaching a
  // shop summary so add-to-cart works. The per-card shop chip is hidden — we're
  // already inside the shop.
  const products = useMemo<FeedProduct[]>(() => {
    const list = productsQuery.data ?? [];
    if (!shop) return [];
    const summary = {
      id: shop.id,
      name: shop.name,
      distanceKm: shop.distanceKm ?? 0,
      deliveryFeeAtUser: shop.deliveryFeeAtUser ?? 0,
      isOpen: shop.isOpenManual,
      photos: shop.photos,
    };
    return list.map((v) => ({ ...v, shop: summary }));
  }, [productsQuery.data, shop]);

  if (shopQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>Do&apos;kon topilmadi</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.column}
        ItemSeparatorComponent={() => <View style={{ height: GUTTER }} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.heroImageWrap}>
              {shop.photos[0] ? (
                <Image source={{ uri: resolveMedia(shop.photos[0]) }} style={styles.heroImage} />
              ) : (
                <View style={[styles.heroImage, styles.placeholder]}>
                  <Store size={56} color={colors.brand.primary} strokeWidth={1.4} />
                </View>
              )}
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.shopAddress}>{shop.address}</Text>
              <View style={styles.metaRow}>
                {shop.distanceKm !== undefined && (
                  <View style={styles.metaItem}>
                    <MapPin size={13} color={colors.text.secondary} strokeWidth={2.4} />
                    <Text style={styles.metaText}>{shop.distanceKm.toFixed(2)} km</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Truck size={13} color={colors.text.secondary} strokeWidth={2.4} />
                  <Text style={styles.metaText}>
                    {shop.deliveryFeeAtUser === 0
                      ? tr('home.deliveryFree')
                      : `${shop.deliveryFeeAtUser?.toLocaleString()} ${tr('common.som')}`}
                  </Text>
                </View>
                {shop.minOrderPrice > 0 && (
                  <Text style={styles.metaText}>
                    {tr('home.minOrder', { price: shop.minOrderPrice.toLocaleString() })}
                  </Text>
                )}
              </View>
              {!shop.isOpenManual && (
                <View style={styles.closedAlert}>
                  <Text style={styles.closedAlertText}>{tr('shop.closedAlert')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionTitle}>{tr('shop.products')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            cardWidth={CARD_WIDTH}
            hideShopChip
            onPress={() => router.push(`/product/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          productsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={[styles.dim, { textAlign: 'center', marginTop: 40 }]}>
              {tr('shop.noProducts')}
            </Text>
          )
        }
      />

      {cartCount > 0 && (
        <Pressable
          style={styles.cartCta}
          onPress={() => router.push(`/shop/${shop.id}/checkout`)}>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount}</Text>
          </View>
          <Text style={styles.cartCtaText}>{tr('shop.order')}</Text>
          <View style={styles.cartCtaRight}>
            <Text style={styles.cartCtaTotal}>{cartTotal.toLocaleString()} {tr('common.som')}</Text>
            <ChevronRight size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 100 },
  column: { gap: GUTTER, paddingHorizontal: SIDE },
  headerWrap: { marginBottom: spacing.md },
  heroImageWrap: { height: 200 },
  heroImage: { width: '100%', height: 200, backgroundColor: colors.bg.surfaceMuted },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primarySurface,
  },
  shopInfo: { padding: layout.screenPadding, gap: spacing.xs },
  shopName: { ...typography.h3, color: colors.text.primary },
  shopAddress: { ...typography.bodySmall, color: colors.text.secondary },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  closedAlert: {
    backgroundColor: colors.feedback.dangerSurface,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  closedAlertText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dim: { ...typography.bodySmall, color: colors.text.secondary },
  cartCta: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    bottom: layout.screenPadding,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.lg,
  },
  // Compact count badge replaces the verbose "N ta mahsulot" text so the bar
  // reads as: [2]  Buyurtma berish  ........  34 000 so'm  ›
  cartBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  cartCtaText: { flex: 1, ...typography.body, color: colors.text.onPrimary, fontWeight: '800' },
  cartCtaRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cartCtaTotal: { ...typography.body, color: colors.text.onPrimary, fontWeight: '800' },
});
