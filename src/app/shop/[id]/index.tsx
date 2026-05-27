import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { PublicProductVariant, PublicShop } from '@/lib/types';
import { useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';

export default function ShopDetailScreen() {
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

  const cartLines = useCartStore((s) => s.carts[id ?? ''] ?? []);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const addItem = useCartStore((s) => s.addItem);

  if (shopQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.blue} />
      </View>
    );
  }

  const shop = shopQuery.data;
  if (!shop) {
    return (
      <View style={styles.center}>
        <Text>Do&apos;kon topilmadi</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={productsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.four }}
        ListHeaderComponent={
          <View>
            <View style={styles.heroImageWrap}>
              {shop.photos[0] ? (
                <Image source={{ uri: shop.photos[0] }} style={styles.heroImage} />
              ) : (
                <View style={[styles.heroImage, styles.placeholder]}>
                  <Text style={styles.placeholderEmoji}>🏪</Text>
                </View>
              )}
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{shop.name}</Text>
              <Text style={styles.shopAddress}>{shop.address}</Text>
              <View style={styles.metaRow}>
                {shop.distanceKm !== undefined && (
                  <Text style={styles.metaItem}>📍 {shop.distanceKm.toFixed(2)} km</Text>
                )}
                <Text style={styles.metaItem}>
                  🚚 {shop.deliveryFeeAtUser === 0
                    ? 'Tekin'
                    : `${shop.deliveryFeeAtUser?.toLocaleString()} so'm`}
                </Text>
                {shop.minOrderPrice > 0 && (
                  <Text style={styles.metaItem}>
                    Min. {shop.minOrderPrice.toLocaleString()} so&apos;m
                  </Text>
                )}
              </View>
              {!shop.isOpenManual && (
                <View style={styles.closedAlert}>
                  <Text style={styles.closedAlertText}>Do&apos;kon hozir yopiq</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionTitle}>Mahsulotlar</Text>
          </View>
        }
        renderItem={({ item }) => {
          const inCart = cartLines.find((l) => l.variantId === item.id);
          return (
            <View style={styles.productCard}>
              <View style={styles.productImageWrap}>
                {item.photos[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.placeholder]}>
                    <Text style={styles.placeholderEmoji}>📦</Text>
                  </View>
                )}
                {item.discountPrice !== null && item.discountPrice < item.price && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      -{Math.round(((item.price - item.discountPrice) / item.price) * 100)}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.discountPrice !== null ? (
                <View>
                  <Text style={styles.oldPrice}>{item.price.toLocaleString()}</Text>
                  <Text style={styles.price}>{item.discountPrice.toLocaleString()} so&apos;m</Text>
                </View>
              ) : (
                <Text style={styles.price}>{item.price.toLocaleString()} so&apos;m</Text>
              )}
              <Pressable
                style={styles.addBtn}
                onPress={() =>
                  addItem({
                    variantId: item.id,
                    shopId: shop.id,
                    shopName: shop.name,
                    productName: item.name,
                    unitPrice: item.discountPrice ?? item.price,
                    quantity: 1,
                    photoUrl: item.photos[0],
                  })
                }>
                <Text style={styles.addBtnText}>
                  {inCart ? `Savatga · ${inCart.quantity}` : '+ Savatga'}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          productsQuery.isLoading ? (
            <ActivityIndicator color={Brand.blue} style={{ marginTop: 40 }} />
          ) : (
            <Text style={[styles.dim, { textAlign: 'center', marginTop: 40 }]}>
              Mahsulot yo&apos;q
            </Text>
          )
        }
      />

      {cartLines.length > 0 && (
        <Pressable
          style={styles.cartCta}
          onPress={() => router.push(`/shop/${shop.id}/checkout`)}>
          <Text style={styles.cartCtaCount}>{cartLines.length} ta mahsulot</Text>
          <Text style={styles.cartCtaText}>Buyurtma berish</Text>
          <Text style={styles.cartCtaTotal}>{cartTotal.toLocaleString()} so&apos;m</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 100 },
  heroImageWrap: { height: 200 },
  heroImage: { width: '100%', height: 200, backgroundColor: Brand.gray100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 64 },
  shopInfo: { padding: Spacing.four, gap: Spacing.two },
  shopName: { fontSize: 22, fontWeight: '800', color: Brand.blue },
  shopAddress: { fontSize: 14, color: Brand.gray600 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginTop: Spacing.two },
  metaItem: { fontSize: 13, color: Brand.gray800, fontWeight: '600' },
  closedAlert: { backgroundColor: '#FFF5F5', padding: Spacing.three, borderRadius: Radius.md, marginTop: Spacing.two },
  closedAlertText: { color: Brand.red, fontWeight: '700', fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.black,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  productCard: {
    flex: 1,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray100,
    borderRadius: Radius.lg,
    marginBottom: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  productImageWrap: { aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  productImage: { width: '100%', height: '100%', backgroundColor: Brand.gray100 },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Brand.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: { color: Brand.white, fontSize: 11, fontWeight: '700' },
  productName: { fontSize: 13, fontWeight: '600', color: Brand.black, minHeight: 32 },
  oldPrice: { fontSize: 11, color: Brand.gray400, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontWeight: '800', color: Brand.blue },
  addBtn: {
    backgroundColor: Brand.blue,
    borderRadius: Radius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addBtnText: { color: Brand.white, fontWeight: '700', fontSize: 13 },
  dim: { fontSize: 13, color: Brand.gray600 },
  cartCta: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.four,
    backgroundColor: Brand.red,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartCtaCount: { color: Brand.white, fontSize: 13, fontWeight: '600', opacity: 0.9 },
  cartCtaText: { color: Brand.white, fontSize: 16, fontWeight: '800' },
  cartCtaTotal: { color: Brand.white, fontSize: 14, fontWeight: '700' },
});
