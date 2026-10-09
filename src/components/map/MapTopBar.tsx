import { Gift, MapPin, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { District } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface MapTopBarProps {
  district: District | null | undefined;
  searchQuery: string | undefined;
  onClearSearch: () => void;
  onlyFreeDelivery: boolean;
  onToggleFreeDelivery: () => void;
  isDark: boolean;
}

export function MapTopBar({
  district,
  searchQuery,
  onClearSearch,
  onlyFreeDelivery,
  onToggleFreeDelivery,
  isDark,
}: MapTopBarProps) {
  const { tr, t } = useTranslation();

  return (
    <SafeAreaView edges={['top']} style={styles.topContainer} pointerEvents="box-none">
      <View style={styles.topBar}>
        {/* District Name Badge */}
        {district && !searchQuery && (
          <View style={[styles.districtBadge, isDark && styles.districtBadgeDark]}>
            <MapPin size={13} color={colors.brand.primary} strokeWidth={2.6} />
            <Text style={styles.districtBadgeText} numberOfLines={1}>
              {t(district.name)}
            </Text>
          </View>
        )}

        {/* Product Search Pill */}
        {searchQuery && (
          <View style={[styles.searchPill, isDark && styles.searchPillDark]}>
            <Text style={styles.searchPillText} numberOfLines={1}>
              “{searchQuery}”
            </Text>
            <Pressable onPress={onClearSearch} hitSlop={8} style={styles.searchCloseBtn}>
              <X size={13} color={colors.text.secondary} strokeWidth={2.4} />
            </Pressable>
          </View>
        )}

        {/* Minimal Free Delivery Toggle Switch */}
        <Pressable
          style={[
            styles.freeToggleBtn,
            isDark && styles.freeToggleBtnDark,
            onlyFreeDelivery && styles.freeToggleBtnActive,
          ]}
          onPress={() => {
            haptics.selection();
            onToggleFreeDelivery();
          }}
        >
          <Gift
            size={13}
            color={onlyFreeDelivery ? '#FFFFFF' : colors.brand.primary}
            strokeWidth={2.4}
          />
          <Text
            style={[
              styles.freeToggleText,
              onlyFreeDelivery && styles.freeToggleTextActive,
            ]}
          >
            {tr('shop.freeShort')} {tr('map.filterDelivery')}
          </Text>
          <View
            style={[
              styles.switchThumb,
              onlyFreeDelivery && styles.switchThumbActive,
            ]}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenPadding,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  districtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    flexShrink: 1,
    ...shadow.md,
  },
  districtBadgeDark: {
    backgroundColor: '#1C2733',
    borderColor: 'rgba(232, 57, 46, 0.4)',
  },
  districtBadgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.md,
  },
  searchPillDark: {
    backgroundColor: '#1C2733',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.primary,
    maxWidth: 160,
  },
  searchCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingLeft: spacing.md,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    ...shadow.md,
  },
  freeToggleBtnDark: {
    backgroundColor: '#1C2733',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  freeToggleBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  freeToggleText: {
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  freeToggleTextActive: {
    color: '#FFFFFF',
  },
  switchThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
  },
  switchThumbActive: {
    backgroundColor: '#10B981',
  },
});
