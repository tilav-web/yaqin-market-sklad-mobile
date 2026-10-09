import { SlidersHorizontal, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PRICE_RANGES, PriceRangeKey } from '@/components/SearchFilterSheet';
import { useTranslation } from '@/i18n';
import { Category } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { colors, typography } from '@/theme';

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
      className="flex-row items-center gap-2 px-4 py-2 border-b"
      style={{
        backgroundColor: activeColors.bg.surface,
        borderBottomColor: activeColors.border.subtle,
      }}
    >
      <Pressable
        className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border-[1.5px]"
        style={{
          backgroundColor: activeColors.brand.primarySurface,
          borderColor: activeColors.brand.primaryBorder,
        }}
        onPress={onOpenFilter}
      >
        <SlidersHorizontal size={15} color={activeColors.brand.primary} strokeWidth={2.4} />
        <Text className="font-extrabold" style={[typography.caption, { color: activeColors.brand.primary }]}>
          {tr('filter.button')}
        </Text>
        {activeCount > 0 && (
          <View
            className="min-w-[18px] h-[18px] rounded-full px-1.5 items-center justify-center"
            style={{ backgroundColor: activeColors.brand.primary }}
          >
            <Text className="text-white text-[11px] font-extrabold">{activeCount}</Text>
          </View>
        )}
      </Pressable>

      {activeCount === 0 ? (
        <Text
          className="flex-1 font-semibold"
          style={[typography.caption, { color: activeColors.text.tertiary }]}
          numberOfLines={1}
        >
          Narx va toifa bo'yicha saralash
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: 'center', paddingRight: 16 }}
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
    <Pressable
      className="flex-row items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border"
      style={{
        backgroundColor: colors.brand.primarySurface,
        borderColor: colors.brand.primaryBorder,
      }}
      onPress={onRemove}
    >
      <Text className="font-bold" style={[typography.caption, { color: colors.brand.primary }]}>
        {label}
      </Text>
      <X size={13} color={colors.brand.primary} strokeWidth={2.8} />
    </Pressable>
  );
}
