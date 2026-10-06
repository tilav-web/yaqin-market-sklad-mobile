import { router } from 'expo-router';
import {
  MessageCircle,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { FeedProduct } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';

interface TelegramProductRowProps {
  readonly item: FeedProduct;
}

export function TelegramProductRow({ item }: TelegramProductRowProps) {
  const { tr } = useTranslation();
  const toast = useToast();
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [chatLoading, setChatLoading] = useState(false);

  const price = item.discountPrice ?? item.price;
  const hasDiscount = item.discountPrice !== null && item.discountPrice < item.price;
  const photo = item.photos && item.photos.length > 0 ? item.photos[0] : null;

  const handleOpenProduct = useCallback(() => {
    haptics.selection();
    router.push(`/product/${item.id}` as any);
  }, [item.id]);

  const handleAddToCart = useCallback((e: any) => {
    e.stopPropagation();
    haptics.light();
    addItem({
      variantId: item.id,
      shopId: item.shop.id,
      shopName: item.shop.name,
      productName: item.name,
      unitPrice: price,
      quantity: 1,
      photoUrl: photo ?? undefined,
    });
    toast.success(`${item.name} savatga qo'shildi`);
  }, [addItem, item, price, photo, toast]);

  const handleChatWithSeller = useCallback(async (e: any) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/(auth)/phone');
      return;
    }
    haptics.selection();
    setChatLoading(true);
    try {
      const res = await api.post(`/conversations/with-shop/${item.shop.id}`);
      const conv = res.data;
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: conv.id,
          conversationId: conv.id,
          shopId: item.shop.id,
          title: item.shop.name,
          productId: item.id,
        },
      });
    } catch {
      // Fallback open chat screen directly
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: item.shop.id,
          shopId: item.shop.id,
          title: item.shop.name,
          productId: item.id,
        },
      });
    } finally {
      setChatLoading(false);
    }
  }, [isAuthenticated, item.shop.id, item.shop.name, item.id]);

  return (
    <Pressable
      onPress={handleOpenProduct}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}>
      {/* Telegram Avatar / Product Image */}
      <View style={styles.imageContainer}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Package size={24} color={colors.text.tertiary} />
          </View>
        )}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>%</Text>
          </View>
        )}
      </View>

      {/* Middle info */}
      <View style={styles.infoCol}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/shop/${item.shop.id}` as any);
          }}
          style={styles.shopRow}>
          <Store size={12} color={colors.text.tertiary} />
          <Text style={styles.shopName} numberOfLines={1}>
            {item.shop.name}
          </Text>
          {item.shop.distanceKm !== undefined && (
            <Text style={styles.shopDistance}>
              • {item.shop.distanceKm < 1 ? `${Math.round(item.shop.distanceKm * 1000)}m` : `${item.shop.distanceKm.toFixed(1)}km`}
            </Text>
          )}
        </Pressable>

        <Text style={styles.unitSize}>
          {item.unitSize} {item.unitType}
        </Text>
      </View>

      {/* Right actions & price */}
      <View style={styles.actionCol}>
        <View style={styles.priceWrap}>
          {hasDiscount && (
            <Text style={styles.oldPrice}>
              {formatMoney(item.price)}
            </Text>
          )}
          <Text style={styles.price}>
            {formatMoney(price)} <Text style={styles.currency}>{tr('common.som')}</Text>
          </Text>
        </View>

        <View style={styles.buttonRow}>
          {/* Quick Chat Button */}
          <Pressable
            onPress={handleChatWithSeller}
            disabled={chatLoading}
            style={({ pressed }) => [
              styles.chatBtn,
              pressed && styles.chatBtnPressed,
            ]}>
            {chatLoading ? (
              <ActivityIndicator size="small" color={colors.brand.primary} />
            ) : (
              <MessageCircle size={16} color={colors.brand.primary} />
            )}
          </Pressable>

          {/* Quick Add to Cart Button */}
          <Pressable
            onPress={handleAddToCart}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.addBtnPressed,
            ]}>
            <Plus size={16} color={colors.text.onPrimary} strokeWidth={2.6} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
  },
  rowPressed: {
    backgroundColor: colors.bg.surfaceMuted,
  },
  imageContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  image: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surfaceMuted,
  },
  imageFallback: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: colors.feedback.danger,
    borderRadius: radius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountText: {
    color: colors.text.onPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 3,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  shopName: {
    ...typography.caption,
    fontSize: 12.5,
    color: colors.text.secondary,
    maxWidth: 120,
  },
  shopDistance: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.text.tertiary,
  },
  unitSize: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  oldPrice: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.hint,
    textDecorationLine: 'line-through',
  },
  price: {
    ...typography.body,
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  currency: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnPressed: {
    opacity: 0.7,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  addBtnPressed: {
    opacity: 0.8,
  },
});
