import { router } from 'expo-router';
import { Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PublicShop } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface TelegramShopStoryAvatarProps {
  readonly shop: PublicShop;
}

export function TelegramShopStoryAvatar({ shop }: TelegramShopStoryAvatarProps) {
  const photo = shop.photos && shop.photos.length > 0 ? shop.photos[0] : null;

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        router.push(`/shop/${shop.id}` as any);
      }}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}>
      {/* Telegram Story-style circle with red ring */}
      <View style={styles.storyRing}>
        <View style={styles.innerWhiteBorder}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Store size={22} color={colors.brand.primary} />
            </View>
          )}
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {shop.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 68,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    padding: 2,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  innerWhiteBorder: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: 64,
  },
});
