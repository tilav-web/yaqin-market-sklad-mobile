import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { ProductReview, PublicProductVariant, VariantDetail } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const UNIT_SHORT: Record<PublicProductVariant['unitType'], string> = {
  piece: 'dona',
  kg: 'kg',
  liter: 'L',
  gram: 'g',
  pack: 'pack',
};
const unitLabel = (v: Pick<PublicProductVariant, 'unitSize' | 'unitType'>) =>
  `${v.unitSize % 1 === 0 ? v.unitSize : v.unitSize.toFixed(1)} ${UNIT_SHORT[v.unitType]}`;

export default function ProductDetailScreen() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  // The active variant is local state so switching variants (0.5L/1L/1.5L)
  // swaps content in place instead of re-opening the whole screen.
  const [activeId, setActiveId] = useState(routeId);
  const id = activeId;

  const detailQuery = useQuery({
    queryKey: ['variant', id],
    queryFn: async () => {
      const res = await api.get<VariantDetail>(`/catalog/products/${id}`);
      return res.data;
    },
    enabled: !!id,
    // Keep showing the previous variant while the new one loads — no skeleton flash.
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

  const product = detailQuery.data;
  const shopId = product?.shopId ?? '';
  const lines = useCartStore((s) => s.carts[shopId] ?? EMPTY_CART);
  const addItem = useCartStore((s) => s.addItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const inCart = lines.find((l) => l.variantId === id);

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

  const finalPrice = product.discountPrice ?? product.price;
  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - finalPrice) / product.price) * 100)
    : 0;
  const outOfStock = product.stock <= 0;

  const handleAdd = () => {
    haptics.success();
    addItem({
      variantId: product.id,
      shopId: product.shopId,
      shopName: product.shop?.name ?? '',
      productName: product.name,
      unitPrice: finalPrice,
      quantity: 1,
      photoUrl: product.photos[0],
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrap}>
          {product.photos[0] ? (
            <Image source={{ uri: product.photos[0] }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <ShoppingBag size={56} color={colors.brand.primary} strokeWidth={1.3} />
            </View>
          )}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>−{discountPct}%</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {product.productFamily?.brand ? (
            <Text style={styles.brand}>{product.productFamily.brand}</Text>
          ) : null}
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.metaRow}>
            <Stars value={product.ratingAverage} />
            <Text style={styles.ratingText}>
              {product.ratingAverage > 0
                ? `${product.ratingAverage.toFixed(1)} · ${product.ratingCount} sharh`
                : 'Hali sharh yo‘q'}
            </Text>
          </View>

          <View style={styles.priceRow}>
            {hasDiscount && (
              <Text style={styles.oldPrice}>{product.price.toLocaleString()}</Text>
            )}
            <Text style={styles.price}>{finalPrice.toLocaleString()} so‘m</Text>
            <Text style={styles.unit}>/ {unitLabel(product)}</Text>
          </View>

          <View style={styles.stockRow}>
            {outOfStock ? (
              <Text style={[styles.stockBadge, styles.stockOut]}>Tugagan</Text>
            ) : product.stock <= product.lowStockThreshold ? (
              <Text style={[styles.stockBadge, styles.stockLow]}>
                Kam qoldi · {product.stock} {UNIT_SHORT[product.unitType]}
              </Text>
            ) : (
              <Text style={[styles.stockBadge, styles.stockOk]}>Mavjud</Text>
            )}
          </View>

          {product.siblings.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Variantlar</Text>
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
                      style={[styles.variantChip, active && styles.variantChipActive]}>
                      <Text
                        style={[styles.variantChipText, active && styles.variantChipTextActive]}>
                        {unitLabel(v)}
                      </Text>
                      <Text
                        style={[
                          styles.variantChipPrice,
                          active && styles.variantChipTextActive,
                        ]}>
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
              <Text style={styles.sectionTitle}>Tavsif</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {product.shop && (
            <Pressable
              style={styles.shopRow}
              onPress={() => {
                haptics.selection();
                router.push(`/shop/${product.shop!.id}`);
              }}>
              <View style={styles.shopIcon}>
                <Store size={18} color={colors.brand.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{product.shop.name}</Text>
                <Text style={styles.shopSub}>
                  {product.shop.isOpenManual ? 'Ochiq' : 'Yopiq'} · Do‘konga o‘tish
                </Text>
              </View>
              <ChevronRight size={20} color={colors.text.hint} />
            </Pressable>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Sharhlar {reviewsQuery.data?.length ? `(${reviewsQuery.data.length})` : ''}
            </Text>
            {reviewsQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : reviewsQuery.data && reviewsQuery.data.length > 0 ? (
              reviewsQuery.data.map((r) => (
                <View key={r.id} style={styles.review}>
                  <View style={styles.reviewHead}>
                    <Text style={styles.reviewName}>{r.userName}</Text>
                    <Stars value={r.stars} size={12} />
                  </View>
                  {r.text ? <Text style={styles.reviewText}>{r.text}</Text> : null}
                </View>
              ))
            ) : (
              <Text style={styles.reviewEmpty}>
                Bu mahsulotga hali sharh yo‘q. Birinchi bo‘lib baholang!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {inCart ? (
          <View style={styles.footerRow}>
            <View style={styles.qtyControl}>
              <Pressable
                onPress={() => {
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity - 1);
                }}
                style={styles.qtyBtn}>
                <Minus size={18} color={colors.brand.primary} strokeWidth={3} />
              </Pressable>
              <Text style={styles.qtyValue}>{inCart.quantity}</Text>
              <Pressable
                onPress={() => {
                  haptics.light();
                  updateQty(product.shopId, product.id, inCart.quantity + 1);
                }}
                style={styles.qtyBtn}>
                <Plus size={18} color={colors.brand.primary} strokeWidth={3} />
              </Pressable>
            </View>
            <Pressable
              style={styles.goCartBtn}
              onPress={() => {
                haptics.selection();
                router.push(`/shop/${product.shopId}/checkout`);
              }}>
              <ShoppingCart size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
              <Text style={styles.goCartText}>Savatga o‘tish</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleAdd}
            disabled={outOfStock}
            style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}>
            <ShoppingBag size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
            <Text style={styles.addBtnText}>
              {outOfStock ? 'Tugagan' : 'Savatga qo‘shish'}
            </Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

function Stars({ value, size = 15 }: { readonly value: number; readonly size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value);
        return (
          <Star
            key={i}
            size={size}
            color={filled ? colors.feedback.warning : colors.border.default}
            fill={filled ? colors.feedback.warning : 'transparent'}
            strokeWidth={2}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { paddingBottom: spacing['4xl'] },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 380,
    backgroundColor: colors.bg.surfaceMuted,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primarySurface,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.brand.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  discountText: { ...typography.bodyStrong, color: colors.text.onAccent, fontWeight: '800' },
  body: {
    padding: layout.screenPadding,
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    marginTop: -spacing.xl,
    paddingTop: spacing.xl,
  },
  brand: { ...typography.overline, color: colors.brand.primary },
  name: { ...typography.h2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingText: { ...typography.caption, color: colors.text.secondary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs },
  oldPrice: {
    ...typography.body,
    color: colors.text.hint,
    textDecorationLine: 'line-through',
  },
  price: { ...typography.h2, color: colors.brand.primary },
  unit: { ...typography.caption, color: colors.text.tertiary },
  stockRow: { flexDirection: 'row', marginTop: spacing.xs },
  stockBadge: {
    ...typography.caption,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  stockOk: { color: colors.feedback.success, backgroundColor: colors.feedback.successSurface },
  stockLow: { color: colors.feedback.warning, backgroundColor: colors.feedback.warningSurface },
  stockOut: { color: colors.feedback.danger, backgroundColor: colors.feedback.dangerSurface },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { ...typography.h4 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  variantChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    minWidth: 72,
  },
  variantChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
  },
  variantChipText: { ...typography.bodyStrong, color: colors.text.primary },
  variantChipPrice: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  variantChipTextActive: { color: colors.brand.primary },
  description: { ...typography.body, color: colors.text.secondary },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.surfaceMuted,
  },
  shopIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...typography.bodyStrong },
  shopSub: { ...typography.caption, color: colors.text.secondary },
  review: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: 4,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewName: { ...typography.bodyStrong, fontSize: 13 },
  reviewText: { ...typography.bodySmall },
  reviewEmpty: { ...typography.bodySmall, color: colors.text.tertiary },
  footer: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    ...shadow.lg,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
  },
  addBtnDisabled: { backgroundColor: colors.text.hint },
  addBtnText: { ...typography.button, color: colors.text.onPrimary },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primarySurface,
    paddingHorizontal: spacing.xs,
  },
  qtyBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { ...typography.h3, color: colors.brand.primary, minWidth: 32, textAlign: 'center' },
  goCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
  },
  goCartText: { ...typography.button, color: colors.text.onPrimary },
});
