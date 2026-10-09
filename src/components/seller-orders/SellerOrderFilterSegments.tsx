import { Truck } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, layout, radius, spacing, typography } from '@/theme';

import { Filter, FILTERS } from './types';

interface SellerOrderFilterSegmentsProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: Record<Filter, number>;
  canSeeRoute: boolean;
  deliveringCount: number;
  onOpenRoute: () => void;
}

export function SellerOrderFilterSegments({
  filter,
  onFilterChange,
  counts,
  canSeeRoute,
  deliveringCount,
  onOpenRoute,
}: SellerOrderFilterSegmentsProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.segments}>
      {FILTERS.map((f) => {
        const cnt = counts[f.key];
        const isActive = filter === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onFilterChange(f.key)}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {tr(f.labelKey)}
            </Text>
            {cnt > 0 && (
              <View
                style={[
                  styles.badge,
                  isActive
                    ? styles.badgeActive
                    : f.key === 'new'
                      ? styles.badgeNew
                      : styles.badgeMuted,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isActive || f.key === 'new' ? styles.badgeTextLight : styles.badgeTextDark,
                  ]}
                >
                  {cnt}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {canSeeRoute && (
        <Pressable style={styles.routeBtn} onPress={onOpenRoute}>
          <Truck size={15} color={colors.brand.primary} strokeWidth={2.4} />
          <View style={styles.routeBadge}>
            <Text style={styles.routeBadgeText}>{deliveringCount}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  segmentActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  segmentTextActive: {
    color: colors.text.onPrimary,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  badgeNew: {
    backgroundColor: colors.feedback.danger,
  },
  badgeMuted: {
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
  },
  badgeTextLight: {
    color: '#fff',
  },
  badgeTextDark: {
    color: colors.text.secondary,
  },
  routeBtn: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.feedback.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg.canvas,
  },
  routeBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
  },
});
