import { router } from 'expo-router';
import { ChevronRight, MessageCircle, Store } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { VariantDetail } from '@/lib/types';
import { radius, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

interface ProductShopCardProps {
  shop: NonNullable<VariantDetail['shop']>;
  productId: string;
  activeColors: {
    brand: { primary: string; primarySurface: string };
    bg: { surfaceMuted: string };
    border: { subtle: string };
    text: { primary: string; secondary: string; hint: string };
  };
}

export function ProductShopCard({ shop, productId, activeColors }: ProductShopCardProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.shopRowWrap}>
      <Pressable
        style={[
          styles.shopRow,
          {
            backgroundColor: activeColors.bg.surfaceMuted,
            borderColor: activeColors.border.subtle,
          },
        ]}
        onPress={() => {
          haptics.selection();
          router.push(`/shop/${shop.id}`);
        }}
      >
        <View
          style={[
            styles.shopIcon,
            { backgroundColor: activeColors.brand.primarySurface },
          ]}
        >
          <Store size={18} color={activeColors.brand.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shopName, { color: activeColors.text.primary }]}>
            {shop.name}
          </Text>
          <Text style={[styles.shopSub, { color: activeColors.text.secondary }]}>
            {shop.isOpenManual ? tr('shop.open') : tr('shop.closed')} · {tr('product.goToShop')}
          </Text>
        </View>
        <ChevronRight size={20} color={activeColors.text.hint} />
      </Pressable>
      <Pressable
        style={[
          styles.shopChatBtn,
          { backgroundColor: activeColors.brand.primary },
        ]}
        onPress={() => {
          haptics.selection();
          router.push({
            pathname: '/chat/[orderId]',
            params: {
              orderId: `shop_${shop.id}`,
              shopId: shop.id,
              title: shop.name,
              productId,
            },
          });
        }}
      >
        <MessageCircle size={16} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.shopChatBtnText}>{tr('nav.chat') || 'Chat'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shopRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shopRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  shopIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '800',
  },
  shopSub: {
    fontSize: 11,
    marginTop: 1,
  },
  shopChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  shopChatBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
