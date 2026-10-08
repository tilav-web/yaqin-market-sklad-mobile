import { router } from 'expo-router';
import {
  ChevronRight,
  MapPin,
  MessageCircle,
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

import { api } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/stores/theme';
import { colors, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface TelegramShopRowProps {
  readonly shop: PublicShop;
}

export function TelegramShopRow({ shop }: TelegramShopRowProps) {
  const { colors: activeColors } = useTheme();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [chatLoading, setChatLoading] = useState(false);

  const photo = shop.photos && shop.photos.length > 0 ? shop.photos[0] : null;

  const handleOpenShop = useCallback(() => {
    haptics.selection();
    router.push(`/shop/${shop.id}` as any);
  }, [shop.id]);

  const handleChatWithShop = useCallback(async (e: any) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/(auth)/phone');
      return;
    }
    haptics.selection();
    setChatLoading(true);
    try {
      const res = await api.post(`/conversations/with-shop/${shop.id}`);
      const conv = res.data;
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: conv.id,
          conversationId: conv.id,
          shopId: shop.id,
          title: shop.name,
        },
      });
    } catch {
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: shop.id,
          shopId: shop.id,
          title: shop.name,
        },
      });
    } finally {
      setChatLoading(false);
    }
  }, [isAuthenticated, shop.id, shop.name]);

  return (
    <Pressable
      onPress={handleOpenShop}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: activeColors.bg.surface },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}>
      {/* Telegram Shop Avatar */}
      <View style={styles.avatarContainer}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={[styles.avatar, { backgroundColor: activeColors.bg.surfaceMuted }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: activeColors.bg.surfaceMuted }]}>
            <Store size={26} color={activeColors.brand.primary} />
          </View>
        )}
        <View style={[styles.statusDot, shop.isOpenManual ? styles.dotOpen : styles.dotClosed]} />
      </View>

      {/* Middle shop details */}
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: activeColors.text.primary }]} numberOfLines={1}>
            {shop.name}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {shop.ratingAverage > 0 && (
            <View style={styles.ratingWrap}>
              <Star size={12} color={colors.feedback.warning} fill={colors.feedback.warning} />
              <Text style={[styles.ratingText, { color: activeColors.text.primary }]}>{shop.ratingAverage.toFixed(1)}</Text>
            </View>
          )}

          {shop.distanceKm !== undefined && (
            <View style={styles.distanceWrap}>
              <MapPin size={11} color={activeColors.text.tertiary} />
              <Text style={[styles.distanceText, { color: activeColors.text.tertiary }]}>
                {shop.distanceKm < 1 ? `${Math.round(shop.distanceKm * 1000)} m` : `${shop.distanceKm.toFixed(1)} km`}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.address, { color: activeColors.text.tertiary }]} numberOfLines={1}>
          {shop.address}
        </Text>
      </View>

      {/* Right action: chat button & chevron */}
      <View style={styles.actionCol}>
        <Pressable
          onPress={handleChatWithShop}
          disabled={chatLoading}
          style={({ pressed }) => [
            styles.chatBtn,
            {
              backgroundColor: activeColors.brand.primarySurface,
              borderColor: activeColors.brand.primaryBorder,
            },
            pressed && styles.chatBtnPressed,
          ]}>
          {chatLoading ? (
            <ActivityIndicator size="small" color={activeColors.brand.primary} />
          ) : (
            <MessageCircle size={16} color={activeColors.brand.primary} />
          )}
        </Pressable>

        <ChevronRight size={18} color={activeColors.text.tertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
  },
  rowPressed: {
    backgroundColor: colors.bg.surfaceMuted,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.bg.surface,
  },
  dotOpen: {
    backgroundColor: colors.feedback.success,
  },
  dotClosed: {
    backgroundColor: colors.text.hint,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 3,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  distanceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  address: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.secondary,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chatBtn: {
    width: 36,
    height: 36,
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
});
