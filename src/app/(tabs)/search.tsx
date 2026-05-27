import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { PublicProductVariant, PublicShop } from '@/lib/types';
import { useEffectiveCoords } from '@/stores/location';

export default function SearchTab() {
  const [q, setQ] = useState('');
  const coords = useEffectiveCoords();

  const shopsQuery = useQuery({
    queryKey: ['shops', 'nearby-search', coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: { lat: coords.latitude, lng: coords.longitude },
      });
      return res.data;
    },
    enabled: !!coords,
  });

  const nearbyShopIds = (shopsQuery.data ?? []).map((s) => s.id);
  const shopIdToName = new Map((shopsQuery.data ?? []).map((s) => [s.id, s.name]));

  const productsQuery = useQuery({
    queryKey: ['products', 'search', q, nearbyShopIds.join(',')],
    queryFn: async () => {
      if (!q || nearbyShopIds.length === 0) return [];
      const all: PublicProductVariant[] = [];
      for (const shopId of nearbyShopIds) {
        const res = await api.get<PublicProductVariant[]>(`/catalog/shops/${shopId}/products`, {
          params: { q },
        });
        all.push(...res.data);
      }
      return all;
    },
    enabled: !!q && nearbyShopIds.length > 0,
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Mahsulot qidirish…"
          placeholderTextColor={Brand.gray400}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {!q ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Mahsulot nomi bo&apos;yicha qidiruv</Text>
          <Text style={styles.dim}>Faqat yaqin do&apos;konlardan</Text>
        </View>
      ) : (
        <FlatList
          data={productsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            productsQuery.isLoading ? (
              <ActivityIndicator color={Brand.blue} style={{ marginTop: 40 }} />
            ) : (
              <Text style={[styles.dim, { textAlign: 'center', marginTop: 40 }]}>
                Mahsulot topilmadi
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/shop/${item.shopId}`)}>
              <View style={styles.productImageWrap}>
                {item.photos[0] ? (
                  <Image source={{ uri: item.photos[0] }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.placeholder]}>
                    <Text style={styles.placeholderEmoji}>📦</Text>
                  </View>
                )}
              </View>
              <View style={styles.productBody}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.shopName} numberOfLines={1}>
                  🏪 {shopIdToName.get(item.shopId) ?? 'do\'kon'}
                </Text>
                <Text style={styles.price}>
                  {(item.discountPrice ?? item.price).toLocaleString()} so&apos;m
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },
  searchBox: { padding: Spacing.four },
  input: {
    backgroundColor: Brand.gray50,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    height: 48,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray100,
    borderRadius: Radius.lg,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  productImageWrap: { width: 96 },
  productImage: { width: 96, height: 96, backgroundColor: Brand.gray100 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 32 },
  productBody: { flex: 1, padding: Spacing.three, gap: 4 },
  productName: { fontSize: 15, fontWeight: '700', color: Brand.black },
  shopName: { fontSize: 12, color: Brand.gray600 },
  price: { fontSize: 16, fontWeight: '800', color: Brand.blue, marginTop: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.six },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Brand.black, textAlign: 'center' },
  dim: { fontSize: 13, color: Brand.gray600 },
});
