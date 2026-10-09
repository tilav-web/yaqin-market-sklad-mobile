import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Crown, Navigation, Phone, Star, Store, X } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { FeedProduct, PublicProductVariant, PublicShop } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { colors, layout, spacing } from '@/theme';

const SCREEN_W = Dimensions.get('window').width;
const GUTTER = spacing.sm;
const CARD_WIDTH = (SCREEN_W - layout.screenPadding * 2 - GUTTER) / 2;

interface Props {
  readonly visible: boolean;
  readonly shop: PublicShop | null;
  readonly onClose: () => void;
}

/**
 * Bottom sheet shown when a shop marker is tapped on the map. Surfaces the
 * shop's info plus its product catalog inline, so the customer can browse and
 * add to cart without leaving the map.
 */
export function ShopPreviewSheet({ visible, shop, onClose }: Props) {
  const { tr } = useTranslation();
  const shopId = shop?.id;

  const productsQuery = useQuery({
    queryKey: ['shop-products', shopId],
    queryFn: async () => {
      const res = await api.get<PublicProductVariant[]>(`/catalog/shops/${shopId}/products`);
      return res.data;
    },
    enabled: visible && !!shopId,
  });

  const cartLines = useCartStore((s) => s.carts[shopId ?? ''] ?? EMPTY_CART);
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

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

  if (!shop) return null;

  const isShowcase = shop.isDeliveryEnabled === false;
  const isDeliveryClosed = !isShowcase && shop.isDeliveryOpenNow === false;

  const goToShop = () => {
    onClose();
    router.push(`/shop/${shop.id}`);
  };
  const goToCheckout = () => {
    onClose();
    router.push(`/shop/${shop.id}/checkout`);
  };

  const handleCall = () => {
    if (shop.phone) void Linking.openURL(`tel:${shop.phone}`);
  };

  const handleRoute = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${shop.latitude},${shop.longitude}`,
      default: `geo:${shop.latitude},${shop.longitude}?q=${shop.latitude},${shop.longitude}(${encodeURIComponent(shop.name)})`,
    });
    if (url) void Linking.openURL(url);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="justify-end" pointerEvents="box-none">
        <View className="h-[82%] bg-surface rounded-t-3xl px-4 pt-2 pb-4 shadow-2xl">
          <View className="w-10 h-1 rounded-full bg-border self-center mb-3" />

          {shop.isPrime && (
            <View className="flex-row items-center gap-1.5 bg-amber-100 border border-amber-300 rounded-xl px-3 py-1.5 mb-2">
              <Crown size={14} color="#D97706" strokeWidth={2.6} />
              <Text className="text-xs font-bold text-amber-800">
                {shop.primeBadgeText ? `${shop.primeBadgeText} Hamkor` : 'Yaqin Prime Hamkor'} • Kafolatlangan sifat
              </Text>
            </View>
          )}

          {/* Shop header */}
          <Pressable className="flex-row items-center gap-3" onPress={goToShop}>
            <View className={`w-11 h-11 rounded-full items-center justify-center ${isShowcase ? 'bg-blue-100' : 'bg-brand-primary/10'}`}>
              <Store size={22} color={isShowcase ? '#2563EB' : colors.brand.primary} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
                {shop.name}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={1}>
                {shop.address}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center">
              <X size={18} color={colors.text.secondary} />
            </Pressable>
          </Pressable>

          {/* Meta badges */}
          <View className="flex-row items-center flex-wrap gap-2 mt-3">
            <Text className={`text-[11px] font-bold px-2 py-0.5 rounded ${shop.isOpenManual ? 'text-emerald-700 bg-emerald-100' : 'text-slate-500 bg-slate-100'}`}>
              {shop.isOpenManual ? tr('shop.open') : tr('shop.closed')}
            </Text>
            {isShowcase ? (
              <Text className="text-[11px] font-bold px-2 py-0.5 rounded text-blue-700 bg-blue-100">
                📍 {tr('shop.inStoreOnly')}
              </Text>
            ) : isDeliveryClosed ? (
              <Text className="text-[11px] font-bold px-2 py-0.5 rounded text-slate-500 bg-slate-100">
                🚚 {tr('shop.deliveryClosed')}
              </Text>
            ) : (
              <Text className="text-xs font-semibold text-text-secondary">
                🚚{' '}
                {shop.deliveryFeeAtUser === 0
                  ? tr('shop.freeShort')
                  : `${shop.deliveryFeeAtUser?.toLocaleString()} ${tr('common.som')}`}
              </Text>
            )}
            {shop.distanceKm !== undefined && (
              <Text className="text-xs font-semibold text-text-secondary">{shop.distanceKm.toFixed(1)} km</Text>
            )}
            {shop.ratingCount > 0 && (
              <View className="flex-row items-center gap-1 bg-amber-100 px-2 py-0.5 rounded">
                <Star size={11} color={colors.feedback.warning} fill={colors.feedback.warning} />
                <Text className="text-[11px] font-bold text-amber-700">{shop.ratingAverage.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Quick contact / navigation action buttons */}
          <View className="flex-row items-center gap-2 mt-3">
            {shop.phone ? (
              <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-subtle" onPress={handleCall}>
                <Phone size={14} color={colors.brand.primary} />
                <Text className="text-xs font-bold text-text-primary">{shop.phone}</Text>
              </Pressable>
            ) : null}
            <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-subtle" onPress={handleRoute}>
              <Navigation size={14} color={colors.brand.primary} />
              <Text className="text-xs font-bold text-text-primary">{tr('shop.openRoute')}</Text>
            </Pressable>
          </View>

          {/* Section title */}
          <View className="flex-row items-center justify-between mt-4 mb-2">
            <Text className="text-sm font-bold text-text-primary">{tr('shop.products')}</Text>
            <Pressable className="flex-row items-center gap-0.5" onPress={goToShop} hitSlop={6}>
              <Text className="text-xs font-bold text-brand-primary">{tr('shop.enter')}</Text>
              <ChevronRight size={15} color={colors.brand.primary} strokeWidth={2.6} />
            </Pressable>
          </View>

          {/* Product grid */}
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            className="flex-1"
            columnWrapperStyle={{ gap: GUTTER }}
            contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: GUTTER }} />}
            ListEmptyComponent={
              productsQuery.isLoading ? (
                <View style={{ gap: GUTTER }}>
                  {[0, 1, 2, 3].map((r) => (
                    <View key={r} className="flex-row" style={{ gap: GUTTER }}>
                      <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                      <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-text-secondary text-center mt-8">{tr('shop.noProducts')}</Text>
              )
            }
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                cardWidth={CARD_WIDTH}
                hideShopChip
                onPress={() => {
                  onClose();
                  router.push(`/product/${item.id}`);
                }}
              />
            )}
          />

          {/* Footer CTA */}
          {cartCount > 0 ? (
            <Pressable className="flex-row items-center gap-2 bg-brand-primary h-12 rounded-xl px-4 mt-2 shadow-md" onPress={goToCheckout}>
              <View className="min-w-[24px] h-6 rounded-full px-1.5 bg-surface items-center justify-center">
                <Text className="text-xs font-extrabold text-brand-primary">{cartCount}</Text>
              </View>
              <Text className="flex-1 text-base font-bold text-white">{tr('shop.order')}</Text>
              <Text className="text-base font-bold text-white">{cartTotal.toLocaleString()} {tr('common.som')}</Text>
            </Pressable>
          ) : (
            <Pressable className="h-12 rounded-xl border border-brand-primary items-center justify-center mt-2" onPress={goToShop}>
              <Text className="text-base font-bold text-brand-primary">{tr('shop.enter')}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
