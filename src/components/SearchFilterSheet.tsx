import { Check, Tag, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/translations';
import { Category } from '@/lib/types';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

export type PriceSort = 'price_asc' | 'price_desc' | null;

export type PriceRangeKey = 'lt10' | '10-30' | '30-100' | 'gt100';

export const PRICE_RANGES: {
  key: PriceRangeKey;
  labelKey: TranslationKey;
  min?: number;
  max?: number;
}[] = [
  { key: 'lt10', labelKey: 'price.lt10', max: 10_000 },
  { key: '10-30', labelKey: 'price.r10_30', min: 10_000, max: 30_000 },
  { key: '30-100', labelKey: 'price.r30_100', min: 30_000, max: 100_000 },
  { key: 'gt100', labelKey: 'price.gt100', min: 100_000 },
];

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly categories: Category[];
  readonly categoryIds: string[];
  readonly onToggleCategory: (id: string) => void;
  readonly onClearCategories: () => void;
  readonly priceSort: PriceSort;
  readonly setPriceSort: (s: PriceSort) => void;
  readonly byRating: boolean;
  readonly setByRating: (v: boolean) => void;
  readonly priceRange: PriceRangeKey | null;
  readonly setPriceRange: (k: PriceRangeKey | null) => void;
  readonly onlyDiscounted: boolean;
  readonly setOnlyDiscounted: (v: boolean) => void;
  readonly onReset: () => void;
  readonly activeCount: number;
}

function PillChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full border ${
        active ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border'
      }`}>
      {active && <Check size={13} color={colors.text.onPrimary} strokeWidth={3} />}
      <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-text-secondary'}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * Full filter panel that slides up from the bottom. Everything is visible at
 * once (no horizontal swiping):
 *  - Sort: a price direction (Arzon/Qimmat) that can be combined with Reyting.
 *  - Categories: multi-select — pick several at once (e.g. Mevalar + Shirinliklar).
 */
export function SearchFilterSheet({
  visible,
  onClose,
  categories,
  categoryIds,
  onToggleCategory,
  onClearCategories,
  priceSort,
  setPriceSort,
  byRating,
  setByRating,
  priceRange,
  setPriceRange,
  onlyDiscounted,
  setOnlyDiscounted,
  onReset,
  activeCount,
}: Props) {
  const { tr, catName } = useTranslation();
  const noSort = !priceSort && !byRating;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="justify-end" pointerEvents="box-none">
        <View className="bg-surface rounded-t-3xl px-4 pt-2 pb-4 shadow-2xl">
          <View className="w-10 h-1 rounded-full bg-border self-center mb-3" />
          <View className="flex-row items-center justify-between pb-3 border-b border-border-subtle">
            <Text className="text-xl font-bold text-text-primary">{tr('filter.button')}</Text>
            <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center">
              <X size={20} color={colors.text.secondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 460 }}
            contentContainerStyle={{ paddingBottom: 16, gap: 12, paddingTop: 12 }}
            showsVerticalScrollIndicator={false}>
            {/* Sort */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('filter.sort')}</Text>
              <Text className="text-xs text-text-secondary">{tr('filter.sortCombineHint')}</Text>
              <View className="flex-row flex-wrap gap-2 mt-1">
                <PillChip
                  label={tr('sort.popular')}
                  active={noSort}
                  onPress={() => {
                    setPriceSort(null);
                    setByRating(false);
                  }}
                />
                <PillChip
                  label={tr('sort.cheap')}
                  active={priceSort === 'price_asc'}
                  onPress={() => setPriceSort(priceSort === 'price_asc' ? null : 'price_asc')}
                />
                <PillChip
                  label={tr('sort.expensive')}
                  active={priceSort === 'price_desc'}
                  onPress={() => setPriceSort(priceSort === 'price_desc' ? null : 'price_desc')}
                />
                <PillChip
                  label={tr('sort.rating')}
                  active={byRating}
                  onPress={() => setByRating(!byRating)}
                />
              </View>
            </View>

            {/* Price range */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('filter.priceRange')}</Text>
              <View className="flex-row flex-wrap gap-2 mt-1">
                {PRICE_RANGES.map((r) => (
                  <PillChip
                    key={r.key}
                    label={tr(r.labelKey)}
                    active={priceRange === r.key}
                    onPress={() => setPriceRange(priceRange === r.key ? null : r.key)}
                  />
                ))}
              </View>
            </View>

            {/* Discount toggle */}
            <View className="flex-row items-center justify-between py-2 border-y border-border-subtle">
              <View className="flex-row items-center gap-2">
                <Tag size={16} color={colors.brand.primary} strokeWidth={2.4} />
                <Text className="text-sm font-semibold text-text-primary">{tr('filter.onlyDiscount')}</Text>
              </View>
              <Switch
                value={onlyDiscounted}
                onValueChange={(v) => {
                  haptics.selection();
                  setOnlyDiscounted(v);
                }}
                trackColor={{ false: colors.border.default, true: colors.brand.primary }}
                thumbColor={colors.bg.surface}
              />
            </View>

            {/* Categories */}
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('filter.category')}</Text>
                {categoryIds.length > 0 && (
                  <Text className="text-xs font-bold text-brand-primary">{tr('filter.countN', { n: categoryIds.length })}</Text>
                )}
              </View>
              <View className="flex-row flex-wrap gap-2 mt-1">
                <PillChip
                  label={tr('filter.all')}
                  active={categoryIds.length === 0}
                  onPress={onClearCategories}
                />
                {categories.map((c) => (
                  <PillChip
                    key={c.id}
                    label={catName(c)}
                    active={categoryIds.includes(c.id)}
                    onPress={() => onToggleCategory(c.id)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row items-center gap-3 pt-3 border-t border-border-subtle">
            <Pressable
              className="py-3 px-4 rounded-xl border border-border items-center justify-center active:opacity-60"
              onPress={() => {
                haptics.selection();
                onReset();
              }}
              disabled={activeCount === 0}>
              <Text className={`text-sm font-bold ${activeCount === 0 ? 'text-text-hint' : 'text-text-primary'}`}>
                {tr('filter.reset')}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary shadow-sm"
              onPress={onClose}>
              <Check size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
              <Text className="text-base font-bold text-white">
                {activeCount > 0 ? tr('filter.applyN', { n: activeCount }) : tr('filter.apply')}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
