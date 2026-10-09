import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ProductBottomBar,
  ProductImageHero,
  ProductOffersSection,
  ProductReviewsSection,
  ProductShopCard,
  UNIT_SHORT,
  unitLabel,
} from '@/components/product';
import { Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { trackAddToCart, trackProductView } from '@/lib/analyticsQueue';
import { api } from '@/lib/api';
import { ProductOffer, ProductReview, VariantDetail } from '@/lib/types';
import {
  EMPTY_CART,
  selectActiveShopId,
  selectActiveShopName,
  useCartStore,
} from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

export default function ProductDetailScreen() {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const [activeId, setActiveId] = useState(routeId);
  const id = activeId;

  const detailQuery = useQuery({
    queryKey: ['variant', id],
    queryFn: async () => {
      const res = await api.get<VariantDetail>(`/catalog/products/${id}`);
      return res.data;
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  const reviewsQuery = useQuery({
    queryKey: ['variant-reviews', id],
    queryFn: async () => {
      const res = await api.get<ProductReview[]>(`/catalog/products/${id}/reviews`);
      return res.data;
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  const qc = useQueryClient();
  const favsQ = useQuery<{ productIds: string[] }>({
    queryKey: ['favorites'],
    queryFn: async () => (await api.get('/users/me/favorites')).data,
  });
  const isFav = favsQ.data?.productIds?.includes(id ?? '') ?? false;
  const favMut = useMutation({
    mutationFn: (add: boolean) =>
      add
        ? api.post(`/users/me/favorites/products/${id}`)
        : api.delete(`/users/me/favorites/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const coords = useEffectiveCoords();
  const product = detailQuery.data;
  const shopId = product?.shopId ?? '';

  const offersQuery = useQuery({
    queryKey: ['product-offers', product?.globalProductId, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      const res = await api.get<ProductOffer[]>(
        `/catalog/global-products/${product!.globalProductId}/offers`,
        { params: { lat: coords?.latitude, lng: coords?.longitude } },
      );
      return res.data;
    },
    enabled: !!product?.globalProductId,
    staleTime: 60_000,
  });

  const lines = useCartStore((s) => s.carts[shopId] ?? EMPTY_CART);
  const addItem = useCartStore((s) => s.addItem);
  const replaceCartWithItem = useCartStore((s) => s.replaceCartWithItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const currentCartShopId = useCartStore(selectActiveShopId);
  const currentCartShopName = useCartStore(selectActiveShopName);
  const inCart = lines.find((l) => l.variantId === id);

  useEffect(() => {
    if (!product) return;
    trackProductView(product.shopId, product.id);
  }, [product]);

  if (detailQuery.isLoading || !product) {
    return (
      <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
        <Skeleton width="100%" height={320} radius={0} />
        <View className="p-4 gap-3">
          <Skeleton width="70%" height={24} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="50%" height={28} />
        </View>
      </SafeAreaView>
    );
  }

  const productName = getLocalizedText(product.name);
  const finalPrice = product.discountPrice ?? product.price;
  const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;
  const outOfStock = product.stock <= 0;

  const handleAdd = () => {
    const lineData = {
      variantId: product.id,
      shopId: product.shopId,
      shopName: product.shop?.name ?? '',
      productName,
      unitPrice: finalPrice,
      quantity: 1,
      photoUrl: product.photos[0],
    };

    if (currentCartShopId && currentCartShopId !== product.shopId) {
      Alert.alert(
        "Boshqa do'kon mahsuloti",
        `Savatingizda «${currentCartShopName ?? "boshqa do'kon"}» mahsulotlari bor. Buyurtma faqat bitta do'kondan amalga oshiriladi.\n\nAvvalgi savatni tozalab, «${product.shop?.name ?? "ushbu do'kon"}» mahsulotini qo'shasizmi?`,
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: 'Tozalash va qo‘shish',
            style: 'destructive',
            onPress: () => {
              replaceCartWithItem(lineData);
              trackAddToCart(product.shopId, product.id);
            },
          },
        ],
      );
      return;
    }

    haptics.success();
    addItem(lineData);
    trackAddToCart(product.shopId, product.id);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: activeColors.bg.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <ProductImageHero
          product={product}
          isFav={isFav}
          outOfStock={outOfStock}
          onToggleFav={() => {
            haptics.medium();
            favMut.mutate(!isFav);
          }}
          activeColors={activeColors}
        />

        <View className="p-4 gap-3" style={{ backgroundColor: activeColors.bg.surface }}>
          <Text className="text-xl font-bold" style={{ color: activeColors.text.primary }}>
            {productName}
          </Text>

          <View className="flex-row items-baseline gap-2">
            {hasDiscount && (
              <Text className="text-sm text-text-tertiary line-through">{product.price.toLocaleString()}</Text>
            )}
            <Text className="text-2xl font-extrabold text-brand-primary" numberOfLines={1}>
              {finalPrice.toLocaleString()}
            </Text>
            <Text className="text-sm font-semibold text-text-secondary">{tr('common.som')}</Text>
          </View>

          {!outOfStock && product.stock <= product.lowStockThreshold && (
            <View className="self-start">
              <Text className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                {tr('product.lowStock')} · {product.stock} {UNIT_SHORT(product.unitType)}
              </Text>
            </View>
          )}

          {product.siblings.length > 1 && (
            <View className="gap-2 pt-2">
              <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider">{tr('product.variants')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {product.siblings.map((v) => {
                  const active = v.id === id;
                  return (
                    <Pressable
                      key={v.id}
                      onPress={() => {
                        if (active) return;
                        haptics.selection();
                        setActiveId(v.id);
                      }}
                      className={`px-3 py-2 rounded-xl border items-center ${
                        active ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border-subtle'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-text-primary'}`}>
                        {unitLabel(v)}
                      </Text>
                      <Text className={`text-[11px] mt-0.5 ${active ? 'text-white/80' : 'text-text-secondary'}`}>
                        {(v.discountPrice ?? v.price).toLocaleString()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {product.description && (
            <View className="gap-1 pt-2">
              <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider">{tr('product.description')}</Text>
              <Text className="text-sm text-text-secondary leading-5">
                {getLocalizedText(product.description)}
              </Text>
            </View>
          )}

          {product.shop && (
            <ProductShopCard
              shop={product.shop}
              productId={product.id}
              activeColors={activeColors}
            />
          )}

          <ProductOffersSection
            offers={offersQuery.data ?? []}
            currentVariantId={id}
            currentPrice={finalPrice}
            isLoading={offersQuery.isLoading}
          />

          <ProductReviewsSection
            reviews={reviewsQuery.data}
            isLoading={reviewsQuery.isLoading}
            activeColors={activeColors}
          />
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <ProductBottomBar
        outOfStock={outOfStock}
        quantityInCart={inCart?.quantity}
        onAddToCart={handleAdd}
        onUpdateQty={(delta) => updateQty(product.shopId, product.id, (inCart?.quantity ?? 0) + delta)}
        onGoToCart={() => {
          haptics.selection();
          router.push(`/shop/${product.shopId}/checkout`);
        }}
        activeColors={activeColors}
      />
    </View>
  );
}
