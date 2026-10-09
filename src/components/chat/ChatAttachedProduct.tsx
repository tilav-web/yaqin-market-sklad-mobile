import { router } from 'expo-router';
import { ChevronRight, Package } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { PublicProductVariant } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';

interface ChatAttachedProductProps {
  product: PublicProductVariant;
}

export function ChatAttachedProduct({ product }: ChatAttachedProductProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.attachedProductBanner}>
      {product.photos?.[0] ? (
        <Image source={{ uri: product.photos[0] }} style={styles.attachedImg} />
      ) : (
        <View style={styles.attachedFallback}>
          <Package size={20} color={colors.brand.primary} />
        </View>
      )}
      <View style={styles.attachedInfo}>
        <Text style={styles.attachedTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.attachedPrice}>
          {formatMoney(product.discountPrice ?? product.price)} {tr('common.som')}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push(`/product/${product.id}` as never)}
        style={styles.attachedAction}
      >
        <Text style={styles.attachedActionText}>{tr('chat.viewProduct')}</Text>
        <ChevronRight size={14} color={colors.brand.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  attachedProductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand.primaryBorder,
  },
  attachedImg: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceMuted,
  },
  attachedFallback: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedInfo: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  attachedTitle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  attachedPrice: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  attachedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  attachedActionText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
});
