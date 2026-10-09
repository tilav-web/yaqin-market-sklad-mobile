import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, shadow, spacing } from '@/theme';

interface SellerAppBottomBarProps {
  step: 1 | 2 | 3;
  bottomInset: number;
  canGoToStep2: boolean;
  canSubmit: boolean;
  isVerifyingSoliq: boolean;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function SellerAppBottomBar({
  step,
  bottomInset,
  canGoToStep2,
  canSubmit,
  isVerifyingSoliq,
  isSubmitting,
  onPrev,
  onNext,
}: SellerAppBottomBarProps) {
  const { tr } = useTranslation();

  const isDisabled =
    (step === 1 && !canGoToStep2) ||
    (step === 2 && isVerifyingSoliq) ||
    (step === 3 && (!canSubmit || isSubmitting));

  const isLoading = isSubmitting || (step === 2 && isVerifyingSoliq);

  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, spacing.md) }]}>
      {step > 1 && (
        <Pressable onPress={onPrev} style={styles.prevButton} hitSlop={8}>
          <ArrowLeft size={18} color={colors.text.primary} strokeWidth={2.2} />
          <Text style={styles.prevBtnText}>{tr('sellerApp.btnBack')}</Text>
        </Pressable>
      )}

      <Pressable
        onPress={onNext}
        disabled={isDisabled}
        style={[styles.nextButton, isDisabled && styles.nextButtonDisabled]}
      >
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.palette.white} />
            <Text style={styles.nextBtnText} numberOfLines={1}>
              {step === 2 ? tr('sellerApp.btnVerifying') : tr('sellerApp.btnSubmitting')}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.nextBtnText} numberOfLines={1}>
              {step === 1 && tr('sellerApp.btnNext')}
              {step === 2 && tr('sellerApp.btnVerify')}
              {step === 3 && tr('sellerApp.btnSubmit')}
            </Text>
            <ArrowRight size={18} color={colors.palette.white} strokeWidth={2.4} />
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.palette.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadow.lg,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.palette.gray50,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    ...shadow.sm,
  },
  nextButtonDisabled: {
    opacity: 0.45,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.palette.white,
    flexShrink: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
