import { Store, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/stores/theme';
import { radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface HomeShopFilterBannerProps {
  activeShopId: string | null;
  activeShopName: string | null;
  onClear: () => void;
}

export function HomeShopFilterBanner({
  activeShopId,
  activeShopName,
  onClear,
}: HomeShopFilterBannerProps) {
  const { colors: activeColors } = useTheme();

  if (!activeShopId) return null;

  return (
    <View
      style={[
        styles.shopFilterBanner,
        {
          backgroundColor: activeColors.brand.primarySurface,
          borderColor: activeColors.brand.primaryBorder,
        },
      ]}
    >
      <View style={styles.shopFilterInfo}>
        <Store size={15} color={activeColors.brand.primary} />
        <Text style={[styles.shopFilterText, { color: activeColors.text.primary }]} numberOfLines={1}>
          Faqat{' '}
          <Text style={{ fontWeight: '800', color: activeColors.brand.primary }}>
            {activeShopName}
          </Text>{' '}
          tovarlari ko'rsatilmoqda
        </Text>
      </View>
      <Pressable
        onPress={() => {
          haptics.selection();
          onClear();
        }}
        hitSlop={8}
        style={[
          styles.shopFilterClearBtn,
          { backgroundColor: activeColors.bg.surface },
        ]}
      >
        <X size={12} color={activeColors.text.secondary} />
        <Text style={[styles.shopFilterClearText, { color: activeColors.text.secondary }]}>
          Barchasi
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shopFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  shopFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  shopFilterText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  shopFilterClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  shopFilterClearText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});
