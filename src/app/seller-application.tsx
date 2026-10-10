import { router, Stack } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SellerAppBottomBar,
  SellerApplicationHeader,
  SellerAppOfertaModal,
  SellerAppStep1Legal,
  SellerAppStep2Soliq,
  SellerAppStep3Bank,
  SellerAppSuccessModal,
  useSellerApplicationForm,
} from '@/components/seller-application';
import { useTheme } from '@/stores/theme';

export default function SellerApplicationScreen() {
  const insets = useSafeAreaInsets();
  const form = useSellerApplicationForm();
  const { colors: activeColors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: activeColors.bg.canvas }} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header & Progress */}
      <SellerApplicationHeader
        step={form.step}
        onBack={() => {
          if (form.step > 1) {
            form.setStep((s) => ((s - 1) as 1 | 2));
          } else {
            router.back();
          }
        }}
      />

      {/* Step Content */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {form.step === 1 && (
            <SellerAppStep1Legal
              platformName={form.platformName}
              commissionRate={form.commissionRate}
              stir={form.stir}
              cleanStir={form.cleanStir}
              isCheckingStir={form.isCheckingStir}
              stirData={form.stirData}
              stirError={form.stirError}
              onStirChange={form.handleStirChange}
              onCheckStir={() => form.handleCheckStir()}
              ofertaAccepted={form.ofertaAccepted}
              onToggleOferta={() => form.setOfertaAccepted((v) => !v)}
              onOpenOfertaModal={() => form.setShowOfertaModal(true)}
            />
          )}

          {form.step === 2 && (
            <SellerAppStep2Soliq
              platformStir={form.platformStir}
              platformName={form.platformName}
              copiedStir={form.copiedStir}
              onCopyStir={form.handleCopyStir}
              soliqVerifyResult={form.soliqVerifyResult}
            />
          )}

          {form.step === 3 && (
            <SellerAppStep3Bank
              bankAccountNumber={form.bankAccountNumber}
              bankMfo={form.bankMfo}
              bankName={form.bankName}
              bankAccountHolderName={form.bankAccountHolderName}
              contactPhone={form.contactPhone}
              companyName={form.companyName}
              stirData={form.stirData}
              cleanStir={form.cleanStir}
              commissionRate={form.commissionRate}
              onBankAccountNumberChange={(t) => form.setBankAccountNumber(form.formatBankAccountInput(t))}
              onBankMfoChange={(t) => form.setBankMfo(form.formatMfoInput(t))}
              onBankNameChange={form.setBankName}
              onBankAccountHolderNameChange={form.setBankAccountHolderName}
              onContactPhoneChange={form.setContactPhone}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Action Bar */}
      <SellerAppBottomBar
        step={form.step}
        bottomInset={insets.bottom}
        canGoToStep2={form.canGoToStep2}
        canSubmit={form.canSubmit}
        isVerifyingSoliq={form.isVerifyingSoliq}
        isSubmitting={form.submitMutation.isPending}
        onPrev={() => form.setStep((s) => ((s - 1) as 1 | 2))}
        onNext={() => {
          if (form.step === 1 && form.canGoToStep2) form.setStep(2);
          else if (form.step === 2) form.handleVerifyAndProceedToStep3();
          else if (form.step === 3 && form.canSubmit) form.submitMutation.mutate();
        }}
      />

      {/* Oferta Modal */}
      <SellerAppOfertaModal
        visible={form.showOfertaModal}
        onClose={() => form.setShowOfertaModal(false)}
        onAccept={() => {
          form.setOfertaAccepted(true);
          form.setShowOfertaModal(false);
        }}
        onOpenExternalPdf={form.handleOpenExternalPdf}
        resolvePdfUrl={form.resolvePdfUrl}
      />

      {/* Custom Success Modal */}
      <SellerAppSuccessModal
        visible={form.showSuccessModal}
        onClose={() => {
          form.setShowSuccessModal(false);
          router.replace('/(tabs)/profile');
        }}
      />
    </SafeAreaView>
  );
}
