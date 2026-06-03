import { Check, Tag, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/translations';
import { Category } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
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
      style={[styles.chip, active && styles.chipActive]}>
      {active && <Check size={13} color={colors.text.onPrimary} strokeWidth={3} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{tr('filter.button')}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <X size={20} color={colors.text.secondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 460 }}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            showsVerticalScrollIndicator={false}>
            {/* Sort — price direction + optional rating (combinable) */}
            <Text style={styles.sectionLabel}>{tr('filter.sort')}</Text>
            <Text style={styles.sectionHint}>{tr('filter.sortCombineHint')}</Text>
            <View style={styles.wrap}>
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

            {/* Price range — single select */}
            <Text style={styles.sectionLabel}>{tr('filter.priceRange')}</Text>
            <View style={styles.wrap}>
              {PRICE_RANGES.map((r) => (
                <PillChip
                  key={r.key}
                  label={tr(r.labelKey)}
                  active={priceRange === r.key}
                  onPress={() => setPriceRange(priceRange === r.key ? null : r.key)}
                />
              ))}
            </View>

            {/* Discount toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Tag size={16} color={colors.brand.primary} strokeWidth={2.4} />
                <Text style={styles.toggleText}>{tr('filter.onlyDiscount')}</Text>
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

            {/* Categories — multi-select */}
            <View style={styles.catHeader}>
              <Text style={styles.sectionLabel}>{tr('filter.category')}</Text>
              {categoryIds.length > 0 && (
                <Text style={styles.catCount}>{tr('filter.countN', { n: categoryIds.length })}</Text>
              )}
            </View>
            <View style={styles.wrap}>
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
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                haptics.selection();
                onReset();
              }}
              disabled={activeCount === 0}>
              <Text style={[styles.resetText, activeCount === 0 && styles.resetTextDisabled]}>
                {tr('filter.reset')}
              </Text>
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={onClose}>
              <Check size={18} color={colors.text.onPrimary} strokeWidth={2.6} />
              <Text style={styles.applyText}>
                {activeCount > 0 ? tr('filter.applyN', { n: activeCount }) : tr('filter.apply')}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.scrim,
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    ...shadow.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h4, color: colors.text.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionHint: { ...typography.caption, color: colors.text.hint, marginBottom: spacing.sm },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  catCount: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.brand.primary,
    marginTop: spacing.md,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '700' },
  chipTextActive: { color: colors.text.onPrimary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  resetBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  resetText: { ...typography.body, color: colors.text.secondary, fontWeight: '700' },
  resetTextDisabled: { color: colors.text.hint },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
  },
  applyText: { ...typography.body, color: colors.text.onPrimary, fontWeight: '700' },
});
