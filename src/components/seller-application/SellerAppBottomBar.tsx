import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

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
    <View
      className="absolute bottom-0 left-0 right-0 bg-bg-surface border-t border-border-subtle px-5 pt-3.5 flex-row gap-3 shadow-lg"
      style={{ paddingBottom: Math.max(bottomInset, 16) }}
    >
      {step > 1 && (
        <Pressable
          onPress={onPrev}
          className="flex-row items-center gap-1.5 px-5 py-3.5 rounded-2xl bg-bg-surface-muted border border-border-default active:opacity-75"
          hitSlop={8}
        >
          <ArrowLeft size={18} color={colors.text.primary} strokeWidth={2.2} />
          <Text className="text-sm font-bold text-text-primary">{tr('sellerApp.btnBack')}</Text>
        </Pressable>
      )}

      <Pressable
        onPress={onNext}
        disabled={isDisabled}
        className={`flex-1 flex-row items-center justify-center gap-2 bg-brand-primary py-3.5 px-4 rounded-2xl shadow-sm ${
          isDisabled ? 'opacity-45' : 'active:opacity-85'
        }`}
      >
        {isLoading ? (
          <View className="flex-row items-center gap-1.5">
            <ActivityIndicator size="small" color={colors.text.onPrimary} />
            <Text className="text-sm font-extrabold text-text-on-primary" numberOfLines={1}>
              {step === 2 ? tr('sellerApp.btnVerifying') : tr('sellerApp.btnSubmitting')}
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-sm font-extrabold text-text-on-primary" numberOfLines={1}>
              {step === 1 && tr('sellerApp.btnNext')}
              {step === 2 && tr('sellerApp.btnVerify')}
              {step === 3 && tr('sellerApp.btnSubmit')}
            </Text>
            <ArrowRight size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
          </>
        )}
      </Pressable>
    </View>
  );
}
