import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
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
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { useTheme } from '@/stores/theme';
import { colors, layout, radius, spacing, typography } from '@/theme';
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
  const updateQty = useCartStore((s) => s.updateQty);
  const inCart = lines.find((l) => l.variantId === id);

  useEffect(() => {
    if (!product) return;
    trackProductView(product.shopId, product.id);
  }, [product?.id, product?.shopId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (detailQuery.isLoading || !product) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Skeleton width="100%" height={320} radius={0} />
        <View style={{ padding: layout.screenPadding, gap: spacing.md }}>
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
    haptics.success();
    addItem({
      variantId: product.id,
      shopId: product.shopId,
      shopName: product.shop?.name ?? '',
      productName,
      unitPrice: finalPrice,
      quantity: 1,
      photoUrl: product.photos[0],
    });
    trackAddToCart(product.shopId, product.id);
  };

  return (
    <View style={[styles.root, { backgroundColor: activeColors.bg.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

        <View style={[styles.body, { backgroundColor: activeColors.bg.surface }]}>
          <Text style={[styles.name, { color: activeColors.text.primary }]}>{productName}</Text>

          <View style={styles.priceRow}>
            {hasDiscount && (
              <Text style={styles.oldPrice}>{product.price.toLocaleString()}</Text>
            )}
            <Text style={styles.price} numberOfLines={1}>
              {finalPrice.toLocaleString()}
            </Text>
            <Text style={styles.currency}>{tr('common.som')}</Text>
          </View>

          {!outOfStock && product.stock <= product.lowStockThreshold && (
            <View style={styles.stockRow}>
              <Text style={[styles.stockBadge, styles.stockLow]}>
                {tr('product.lowStock')} · {product.stock} {UNIT_SHORT(product.unitType)}
              </Text>
            </View>
          )}

          {product.siblings.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{tr('product.variants')}</Text>
              <View style={styles.variantRow}>
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
                      style={[styles.variantChip, active && styles.variantChipActive]}
                    >
                      <Text
                        style={[styles.variantChipText, active && styles.variantChipTextActive]}
                      >
                        {unitLabel(v)}
                      </Text>
                      <Text
                        style={[
                          styles.variantChipPrice,
                          active && styles.variantChipTextActive,
                        ]}
                      >
                        {(v.discountPrice ?? v.price).toLocaleString()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{tr('product.description')}</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { paddingBottom: spacing['4xl'] },
  body: {
    padding: layout.screenPadding,
    gap: spacing.md,
  },
  name: {
    ...typography.h3,
    lineHeight: 28,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  oldPrice: {
    ...typography.body,
    color: colors.text.hint,
    textDecorationLine: 'line-through',
    marginRight: spacing.xs,
  },
  price: {
    ...typography.h2,
    color: colors.brand.primary,
  },
  currency: {
    ...typography.body,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  stockRow: {
    flexDirection: 'row',
  },
  stockBadge: {
    ...typography.caption,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  stockLow: {
    backgroundColor: colors.feedback.warningSurface,
    color: colors.feedback.warning,
  },
  section: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  variantChip: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.bg.surfaceMuted,
  },
  variantChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
  },
  variantChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  variantChipPrice: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  variantChipTextActive: {
    color: colors.brand.primary,
    fontWeight: '800',
  },
});
