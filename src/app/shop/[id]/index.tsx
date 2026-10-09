import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { ShopDetailHeader } from '@/components/shop/ShopDetailHeader';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { FeedProduct, PublicProductVariant, PublicShop } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

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

  const qc = useQueryClient();

  const favsQ = useQuery<{ shopIds: string[] }>({
    queryKey: ['favorites'],
    queryFn: async () => (await api.get('/users/me/favorites')).data,
  });
  const isFav = favsQ.data?.shopIds?.includes(id ?? '') ?? false;

  const favMut = useMutation({
    mutationFn: (add: boolean) =>
      add
        ? api.post(`/users/me/favorites/shops/${id}`)
        : api.delete(`/users/me/favorites/shops/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const cartLines = useCartStore((s) => s.carts[id ?? ''] ?? EMPTY_CART);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const shop = shopQuery.data;

  const products = useMemo<FeedProduct[]>(() => {
    const list = productsQuery.data ?? [];
    if (!shop) return [];
    const summary = {
      id: shop.id,
      name: shop.name,
      distanceKm: shop.distanceKm ?? 0,
      deliveryFeeAtUser: shop.deliveryFeeAtUser ?? 0,
      isOpen: shop.isOpenManual,
      isDeliveryOpen: shop.isDeliveryOpenNow,
      isDeliveryEnabled: shop.isDeliveryEnabled,
      isPickupEnabled: shop.isPickupEnabled,
      phone: shop.phone,
      photos: shop.photos,
    };
    return list.map((v) => ({ ...v, shop: summary }));
  }, [productsQuery.data, shop]);

  if (shopQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text className="text-sm text-text-secondary">{tr('shopPage.notFound')}</Text>
      </View>
    );
  }

  const handleCall = () => {
    if (shop.phone) void Linking.openURL(`tel:${shop.phone}`);
  };

  const handleChat = async () => {
    haptics.selection();
    try {
      const res = await api.post(`/conversations/with-shop/${shop.id}`);
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: res.data.id,
          conversationId: res.data.id,
          shopId: shop.id,
          title: shop.name,
        },
      });
    } catch {
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: `shop_${shop.id}`,
          shopId: shop.id,
          title: shop.name,
        },
      });
    }
  };

  const handleRoute = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${shop.latitude},${shop.longitude}`,
      default: `geo:${shop.latitude},${shop.longitude}?q=${shop.latitude},${shop.longitude}(${encodeURIComponent(shop.name)})`,
    });
    if (url) void Linking.openURL(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        numColumns={2}
        columnWrapperStyle={{ gap: GUTTER }}
        ItemSeparatorComponent={() => <View style={{ height: GUTTER }} />}
        refreshControl={
          <RefreshControl
            refreshing={
              (shopQuery.isFetching && !shopQuery.isLoading) ||
              (productsQuery.isFetching && !productsQuery.isLoading)
            }
            onRefresh={() => {
              void shopQuery.refetch();
              void productsQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        ListHeaderComponent={
          <ShopDetailHeader
            shop={shop}
            isFav={isFav}
            onToggleFav={() => {
              haptics.medium();
              favMut.mutate(!isFav);
            }}
            onCall={handleCall}
            onChat={handleChat}
            onRoute={handleRoute}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            cardWidth={CARD_WIDTH}
            hideShopChip
            onPress={() => router.push(`/product/${item.id}`)}
          />
        )}
      />

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <View className="absolute left-4 right-4 bottom-4">
          <Pressable
            className="flex-row items-center gap-2 bg-brand-primary h-12 rounded-2xl px-4 shadow-lg active:opacity-90"
            onPress={() => router.push(`/shop/${id}/checkout`)}>
            <View className="min-w-[24px] h-6 rounded-full px-1.5 bg-surface items-center justify-center">
              <Text className="text-xs font-extrabold text-brand-primary">{cartCount}</Text>
            </View>
            <Text className="flex-1 text-base font-bold text-white">{tr('cart.total')}</Text>
            <Text className="text-base font-bold text-white">{cartTotal.toLocaleString()} {tr('common.som')}</Text>
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
