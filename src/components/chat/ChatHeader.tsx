import { router } from 'expo-router';
import { ArrowLeft, Store } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { colors, radius, spacing, typography } from '@/theme';

interface ChatHeaderProps {
  chatTitle: string | undefined;
  shopId: string | undefined;
}

export function ChatHeader({ chatTitle, shopId }: ChatHeaderProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: activeColors.bg.surface,
          borderBottomColor: activeColors.border.subtle,
        },
      ]}
    >
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
        <ArrowLeft size={22} color={activeColors.text.primary} />
      </Pressable>

      <View style={styles.headerTitleWrap}>
        <Text style={[styles.headerTitle, { color: activeColors.text.primary }]} numberOfLines={1}>
          {chatTitle || (shopId ? tr('nav.shop') : tr('nav.chat'))}
        </Text>
        <Text style={styles.headerStatus}>{tr('chat.online')}</Text>
      </View>

      {shopId ? (
        <Pressable
          onPress={() => router.push(`/shop/${shopId}` as never)}
          style={[styles.shopNavBtn, { backgroundColor: activeColors.brand.primarySurface }]}
        >
          <Store size={20} color={activeColors.brand.primary} />
        </Pressable>
      ) : (
        <View style={{ width: 32 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 6,
    borderRadius: radius.full,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
  },
  headerStatus: {
    ...typography.caption,
    fontSize: 11,
    color: colors.feedback.success,
    fontWeight: '500',
  },
  shopNavBtn: {
    padding: 6,
    borderRadius: radius.full,
  },
});
