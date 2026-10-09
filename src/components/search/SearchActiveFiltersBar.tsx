import { SlidersHorizontal, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRICE_RANGES, PriceRangeKey } from '@/components/SearchFilterSheet';
import { useTranslation } from '@/i18n';
import { Category } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface SearchActiveFiltersBarProps {
  activeCount: number;
  sortActive: boolean;
  sortSummary: string;
  onClearSort: () => void;
  priceRange: PriceRangeKey | null;
  onClearPriceRange: () => void;
  selectedCategories: Category[];
  onToggleCategory: (id: string) => void;
  onlyDiscounted: boolean;
  onClearDiscounted: () => void;
  onOpenFilter: () => void;
}

export function SearchActiveFiltersBar({
  activeCount,
  sortActive,
  sortSummary,
  onClearSort,
  priceRange,
  onClearPriceRange,
  selectedCategories,
  onToggleCategory,
  onlyDiscounted,
  onClearDiscounted,
  onOpenFilter,
}: SearchActiveFiltersBarProps) {
  const { tr, catName } = useTranslation();
  const { colors: activeColors } = useTheme();

  const range = priceRange ? PRICE_RANGES.find((r) => r.key === priceRange) : null;

  return (
    <View
      style={[
        styles.filterBar,
        {
          backgroundColor: activeColors.bg.surface,
          borderBottomColor: activeColors.border.subtle,
        },
      ]}
    >
      <Pressable
        style={[
          styles.filterBtn,
          {
            backgroundColor: activeColors.brand.primarySurface,
            borderColor: activeColors.brand.primaryBorder,
          },
        ]}
        onPress={onOpenFilter}
      >
        <SlidersHorizontal size={15} color={activeColors.brand.primary} strokeWidth={2.4} />
        <Text style={[styles.filterBtnText, { color: activeColors.brand.primary }]}>{tr('filter.button')}</Text>
        {activeCount > 0 && (
          <View style={[styles.filterBadge, { backgroundColor: activeColors.brand.primary }]}>
            <Text style={styles.filterBadgeText}>{activeCount}</Text>
          </View>
        )}
      </Pressable>

      {activeCount === 0 ? (
        <Text style={[styles.filterHint, { color: activeColors.text.tertiary }]} numberOfLines={1}>
          Narx va toifa bo'yicha saralash
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeRow}
          keyboardShouldPersistTaps="handled"
        >
          {sortActive ? <ActiveChip label={sortSummary} onRemove={onClearSort} /> : null}
          {range ? (
            <ActiveChip label={tr(range.labelKey)} onRemove={onClearPriceRange} />
          ) : null}
          {selectedCategories.map((c) => (
            <ActiveChip key={c.id} label={catName(c)} onRemove={() => onToggleCategory(c.id)} />
          ))}
          {onlyDiscounted && (
            <ActiveChip label={tr('filter.discounted')} onRemove={onClearDiscounted} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Pressable style={styles.activeChip} onPress={onRemove}>
      <Text style={styles.activeChipText}>{label}</Text>
      <X size={13} color={colors.brand.primary} strokeWidth={2.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  filterBtnText: { ...typography.caption, fontWeight: '800' },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: colors.text.onPrimary, fontSize: 11, fontWeight: '800' },
  filterHint: { flex: 1, ...typography.caption, fontWeight: '600' },
  activeRow: { gap: spacing.sm, alignItems: 'center', paddingRight: spacing.md },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  activeChipText: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
});
