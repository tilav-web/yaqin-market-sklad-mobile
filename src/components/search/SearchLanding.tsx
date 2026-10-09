import { Clock, Tag, X } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Category } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

const SCREEN_W = Dimensions.get('window').width;

interface SearchLandingProps {
  history: string[];
  onRunTerm: (t: string) => void;
  onRemoveTerm: (t: string) => void;
  onClearHistory: () => void;
  categories: Category[];
  onPickCategory: (id: string) => void;
}

export function SearchLanding({
  history,
  onRunTerm,
  onRemoveTerm,
  onClearHistory,
  categories,
  onPickCategory,
}: SearchLandingProps) {
  const { tr, catName } = useTranslation();

  return (
    <ScrollView
      style={styles.landing}
      contentContainerStyle={styles.landingContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {history.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Clock size={15} color={colors.text.secondary} strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>{tr('search.recent')}</Text>
            </View>
            <Pressable onPress={onClearHistory} hitSlop={8}>
              <Text style={styles.clearAll}>{tr('search.clear')}</Text>
            </Pressable>
          </View>
          <View style={styles.wrap}>
            {history.map((term) => (
              <View key={term} style={styles.historyChip}>
                <Pressable
                  style={styles.historyChipMain}
                  onPress={() => onRunTerm(term)}
                  hitSlop={6}
                >
                  <Clock size={12} color={colors.text.tertiary} strokeWidth={2.4} />
                  <Text style={styles.historyChipText} numberOfLines={1}>
                    {term}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onRemoveTerm(term)} hitSlop={8} style={styles.historyX}>
                  <X size={13} color={colors.text.tertiary} strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeadLeft}>
          <Tag size={15} color={colors.text.secondary} strokeWidth={2.4} />
          <Text style={styles.sectionTitle}>{tr('search.categories')}</Text>
        </View>
        <View style={[styles.wrap, { marginTop: spacing.md }]}>
          {categories.map((c) => (
            <Pressable key={c.id} style={styles.catChip} onPress={() => onPickCategory(c.id)}>
              <Text style={styles.catChipText}>{catName(c)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  landing: { flex: 1 },
  landingContent: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  section: { marginBottom: spacing.xl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { ...typography.bodyStrong, color: colors.text.primary },
  clearAll: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    height: 38,
    maxWidth: SCREEN_W * 0.6,
  },
  historyChipMain: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  historyChipText: { ...typography.bodySmall, color: colors.text.primary, fontWeight: '600', flexShrink: 1 },
  historyX: { paddingLeft: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  catChipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '700' },
});
