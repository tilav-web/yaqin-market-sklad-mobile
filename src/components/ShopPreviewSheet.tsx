import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Star, Store, X } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
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
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

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
      photos: shop.photos,
    };
    return list.map((v) => ({ ...v, shop: summary }));
  }, [productsQuery.data, shop]);

  if (!shop) return null;

  const goToShop = () => {
    onClose();
    router.push(`/shop/${shop.id}`);
  };
  const goToCheckout = () => {
    onClose();
    router.push(`/shop/${shop.id}/checkout`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Shop header */}
          <Pressable style={styles.header} onPress={goToShop}>
            <View style={styles.icon}>
              <Store size={22} color={colors.brand.primary} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {shop.name}
              </Text>
              <Text style={styles.address} numberOfLines={1}>
                {shop.address}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <X size={18} color={colors.text.secondary} />
            </Pressable>
          </Pressable>

          {/* Meta badges */}
          <View style={styles.metaRow}>
            <Text style={[styles.badge, shop.isOpenManual ? styles.badgeOpen : styles.badgeClosed]}>
              {shop.isOpenManual ? tr('shop.open') : tr('shop.closed')}
            </Text>
            {shop.distanceKm !== undefined && (
              <Text style={styles.metaText}>{shop.distanceKm.toFixed(1)} km</Text>
            )}
            <Text style={styles.metaText}>
              🚚{' '}
              {shop.deliveryFeeAtUser === 0
                ? tr('shop.freeShort')
                : `${shop.deliveryFeeAtUser?.toLocaleString()} ${tr('common.som')}`}
            </Text>
            {shop.ratingCount > 0 && (
              <View style={styles.ratingPill}>
                <Star size={11} color={colors.feedback.warning} fill={colors.feedback.warning} />
                <Text style={styles.ratingText}>{shop.ratingAverage.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{tr('shop.products')}</Text>
            <Pressable style={styles.shopLink} onPress={goToShop} hitSlop={6}>
              <Text style={styles.shopLinkText}>{tr('shop.enter')}</Text>
              <ChevronRight size={15} color={colors.brand.primary} strokeWidth={2.6} />
            </Pressable>
          </View>

          {/* Product grid */}
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            style={styles.flatList}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: GUTTER }} />}
            ListEmptyComponent={
              productsQuery.isLoading ? (
                <View style={styles.skeletonWrap}>
                  {[0, 1, 2, 3].map((r) => (
                    <View key={r} style={styles.skeletonRow}>
                      <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                      <ProductCardSkeleton cardWidth={CARD_WIDTH} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.empty}>{tr('shop.noProducts')}</Text>
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

          {/* Footer CTA adapts to cart state */}
          {cartCount > 0 ? (
            <Pressable style={styles.cta} onPress={goToCheckout}>
              <View style={styles.ctaBadge}>
                <Text style={styles.ctaBadgeText}>{cartCount}</Text>
              </View>
              <Text style={styles.ctaText}>{tr('shop.order')}</Text>
              <Text style={styles.ctaTotal}>{cartTotal.toLocaleString()} {tr('common.som')}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.ctaOutline} onPress={goToShop}>
              <Text style={styles.ctaOutlineText}>{tr('shop.enter')}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.scrim,
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    // Fixed tall height so the sheet opens at a consistent size immediately —
    // it never collapses to the bottom while products are still loading.
    height: '82%',
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    ...shadow.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.h4, color: colors.text.primary },
  address: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeOpen: { color: colors.feedback.success, backgroundColor: colors.feedback.successSurface },
  badgeClosed: { color: colors.text.tertiary, backgroundColor: colors.bg.surfaceMuted },
  metaText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.feedback.warningSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  ratingText: { ...typography.caption, fontSize: 11, fontWeight: '700', color: colors.feedback.warning },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.bodyStrong, color: colors.text.primary },
  shopLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  shopLinkText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  flatList: { flex: 1 },
  column: { gap: GUTTER },
  skeletonWrap: { gap: GUTTER },
  skeletonRow: { flexDirection: 'row', gap: GUTTER },
  list: { paddingBottom: spacing.md, flexGrow: 1 },
  empty: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xl },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    ...shadow.md,
  },
  ctaBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBadgeText: { ...typography.caption, color: colors.brand.primary, fontWeight: '800', fontSize: 12 },
  ctaText: { flex: 1, ...typography.body, color: colors.text.onPrimary, fontWeight: '800' },
  ctaTotal: { ...typography.body, color: colors.text.onPrimary, fontWeight: '800' },
  ctaOutline: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaOutlineText: { ...typography.body, color: colors.brand.primary, fontWeight: '800' },
});
