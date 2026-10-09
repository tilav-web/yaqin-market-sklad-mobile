import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

interface SellerApplicationHeaderProps {
  step: 1 | 2 | 3;
  onBack: () => void;
}

export function SellerApplicationHeader({ step, onBack }: SellerApplicationHeaderProps) {
  const { tr } = useTranslation();

  return (
    <>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{tr('sellerApp.headerTitle')}</Text>
          <Text style={styles.headerSubtitle}>
            {step === 1 && tr('sellerApp.step1Badge')}
            {step === 2 && tr('sellerApp.step2Badge')}
            {step === 3 && tr('sellerApp.step3Badge')}
          </Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}/3</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressSegments}>
          <View style={[styles.segment, styles.segmentActive]} />
          <View style={[styles.segment, step >= 2 && styles.segmentActive]} />
          <View style={[styles.segment, step >= 3 && styles.segmentActive]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, step === 1 && styles.progressLabelActive]}>
            {tr('sellerApp.tab1')}
          </Text>
          <Text style={[styles.progressLabel, step === 2 && styles.progressLabelActive]}>
            {tr('sellerApp.tab2')}
          </Text>
          <Text style={[styles.progressLabel, step === 3 && styles.progressLabelActive]}>
            {tr('sellerApp.tab3')}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.palette.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.primary,
    marginTop: 1,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  progressContainer: {
    backgroundColor: colors.palette.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  progressSegments: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.palette.gray200,
  },
  segmentActive: {
    backgroundColor: colors.brand.primary,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.hint,
  },
  progressLabelActive: {
    color: colors.text.primary,
    fontWeight: '700',
  },
});
