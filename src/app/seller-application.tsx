import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PlatformConfig,
  SellerAppBottomBar,
  SellerApplicationHeader,
  SellerAppOfertaModal,
  SellerAppStep1Legal,
  SellerAppStep2Soliq,
  SellerAppStep3Bank,
  SellerAppSuccessModal,
  SoliqVerifyResult,
  StirData,
} from '@/components/seller-application';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing } from '@/theme';

export default function SellerApplicationScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const { tr } = useTranslation();

  // Stepper State: 1 | 2 | 3
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Legal & STIR
  const [stir, setStir] = useState('');
  const [isCheckingStir, setIsCheckingStir] = useState(false);
  const [stirData, setStirData] = useState<StirData | null>(null);
  const [stirError, setStirError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState(user?.name || '');
  const [legalAddress, setLegalAddress] = useState('');
  const [ofertaAccepted, setOfertaAccepted] = useState(false);
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Step 2: Soliq biriktiruvi
  const [copiedStir, setCopiedStir] = useState(false);
  const [isVerifyingSoliq, setIsVerifyingSoliq] = useState(false);
  const [soliqVerifyResult, setSoliqVerifyResult] = useState<SoliqVerifyResult | null>(null);

  // Step 3: Bank Account & Contact
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankMfo, setBankMfo] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');

  // Platform info fetched dynamically from admin settings via backend
  const { data: platformConfig } = useQuery<PlatformConfig>({
    queryKey: ['platform-config'],
    queryFn: async () => {
      const res = await api.get<PlatformConfig>('/sellers/platform-config');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const platformStir = platformConfig?.platformStir || '313296455';
  const platformName = platformConfig?.platformName || '"TILAV" MCHJ (Yaqin Market)';
  const commissionRate = platformConfig?.commissionRate ?? 12;

  const resolvePdfUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    let domain = 'https://api.yaqin-market.uz';
    if (api.defaults.baseURL) {
      try {
        const parsed = new URL(api.defaults.baseURL);
        domain = parsed.origin;
      } catch {
        domain = 'https://api.yaqin-market.uz';
      }
    }
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${domain}${cleanPath}`;
  };

  const handleOpenOferta = () => {
    setShowOfertaModal(true);
  };

  const handleOpenExternalPdf = async () => {
    const pdfUrl = platformConfig?.ofertaPdfUrl || '/api/uploads/legal/oferta.pdf';
    const fullPdfUrl = resolvePdfUrl(pdfUrl);
    try {
      await WebBrowser.openBrowserAsync(fullPdfUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: colors.brand.primary,
        controlsColor: '#ffffff',
        dismissButtonStyle: 'close',
        showTitle: true,
      });
    } catch {
      // ignore
    }
  };

  const cleanStir = stir.replace(/\D/g, '').slice(0, 9);

  const validateStirRealtime = (val: string): string | null => {
    if (!val || val.length === 0) return null;
    const first = val[0];
    if (!['2', '3', '4', '5', '6'].includes(first)) {
      return tr('sellerApp.stirInvalidStart');
    }
    if (val.length === 9) {
      if (
        /^(\d)\1{8}$/.test(val) ||
        val === '123456789' ||
        val === '987654321' ||
        val === '123123123' ||
        val === '012345678' ||
        val === '999999999' ||
        val === '000000000'
      ) {
        return tr('sellerApp.stirNotFound');
      }
    }
    return null;
  };

  const handleStirChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 9);
    setStir(cleaned);

    const realtimeErr = validateStirRealtime(cleaned);
    setStirError(realtimeErr);

    if (stirData && cleaned !== stirData.stir) {
      setStirData(null);
    }

    if (cleaned.length === 9 && !realtimeErr && (!stirData || stirData.stir !== cleaned)) {
      handleCheckStir(cleaned);
    }
  };

  const handleCheckStir = async (targetStir?: string) => {
    const query = (targetStir || cleanStir).trim();
    if (query.length !== 9) {
      setStirError(tr('sellerApp.stirLengthError'));
      return;
    }

    const realtimeErr = validateStirRealtime(query);
    if (realtimeErr) {
      setStirError(realtimeErr);
      setStirData(null);
      return;
    }

    setStirError(null);
    setIsCheckingStir(true);
    try {
      const res = await api.get<StirData>(`/sellers/lookup-stir/${query}`);
      setStirData(res.data);
      setStirError(null);
      if (res.data.companyName) {
        setCompanyName(res.data.companyName);
        setBankAccountHolderName(res.data.companyName);
      }
      if (res.data.legalName) setLegalName(res.data.legalName);
      if (res.data.legalAddress) setLegalAddress(res.data.legalAddress);
      toast.success(tr('sellerApp.toastStirVerified'));
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (e) {
      setStirData(null);
      const errMsg = extractErrorMessage(e) || tr('sellerApp.stirNotFoundFallback');
      setStirError(errMsg);
      toast.error(errMsg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    } finally {
      setIsCheckingStir(false);
    }
  };

  const handleVerifyAndProceedToStep3 = async () => {
    if (!cleanStir || cleanStir.length !== 9) {
      toast.warning(tr('sellerApp.enterStirFirst'));
      return;
    }

    setIsVerifyingSoliq(true);
    try {
      const res = await api.get<SoliqVerifyResult>(`/sellers/check-commissioner/${cleanStir}`);
      setSoliqVerifyResult(res.data);
      if (res.data.isAttached) {
        toast.success(tr('sellerApp.toastSoliqSuccess'));
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setStep(3);
      } else {
        toast.warning(res.data.message || tr('sellerApp.toastSoliqWarning'));
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }
    } catch (e) {
      const errMsg = extractErrorMessage(e) || tr('sellerApp.soliqCheckError');
      setSoliqVerifyResult({
        isAttached: false,
        message: errMsg,
      });
      toast.error(errMsg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    } finally {
      setIsVerifyingSoliq(false);
    }
  };

  const handleCopyStir = () => {
    setCopiedStir(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setTimeout(() => setCopiedStir(false), 3000);
  };

  const formatBankAccountInput = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 20);
    const groups = raw.match(/.{1,4}/g);
    return groups ? groups.join(' ') : raw;
  };

  const formatMfoInput = (text: string) => {
    return text.replace(/\D/g, '').slice(0, 5);
  };

  const canGoToStep2 =
    cleanStir.length === 9 &&
    !!stirData &&
    stirData.status === 'active' &&
    !!stirData.companyName &&
    stirData.companyName.trim().length >= 2 &&
    ofertaAccepted;

  const rawAccount = bankAccountNumber.replace(/\s+/g, '');
  const rawMfo = bankMfo.replace(/\s+/g, '');
  const canSubmit =
    rawAccount.length === 20 && rawMfo.length === 5 && bankAccountHolderName.trim().length >= 2;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const appliedCompanyName = (stirData?.companyName || companyName).trim();
      const appliedLegalName = (stirData?.legalName || legalName || user?.name || '').trim();
      const nameParts = appliedLegalName.split(/\s+/);
      const firstName = nameParts[0] || 'Tadbirkor';
      const lastName = nameParts.slice(1).join(' ') || '';

      const res = await api.post('/sellers/apply', {
        firstName,
        lastName,
        stir: cleanStir,
        companyName: appliedCompanyName,
        entityType: stirData?.entityType || 'MChJ',
        legalAddress: (stirData?.legalAddress || legalAddress || 'Qashqadaryo viloyati').trim(),
        bankAccountNumber: rawAccount,
        bankMfo: rawMfo,
        bankName: bankName.trim() || 'Bank',
        bankAccountHolderName: bankAccountHolderName.trim() || appliedCompanyName,
        phone: contactPhone || user?.phone,
        soliqConfirmed: true,
        ofertaAccepted: true,
      });
      return res.data;
    },
    onSuccess: () => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['seller-profile'] });
      queryClient.invalidateQueries({ queryKey: ['seller-bank-accounts'] });
      setShowSuccessModal(true);
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e));
    },
  });

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header & Progress */}
      <SellerApplicationHeader
        step={step}
        onBack={() => {
          if (step > 1) {
            setStep((s) => ((s - 1) as 1 | 2));
          } else {
            router.back();
          }
        }}
      />

      {/* Step Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <SellerAppStep1Legal
              platformName={platformName}
              commissionRate={commissionRate}
              stir={stir}
              cleanStir={cleanStir}
              isCheckingStir={isCheckingStir}
              stirData={stirData}
              stirError={stirError}
              onStirChange={handleStirChange}
              onCheckStir={() => handleCheckStir()}
              ofertaAccepted={ofertaAccepted}
              onToggleOferta={() => setOfertaAccepted((v) => !v)}
              onOpenOfertaModal={handleOpenOferta}
            />
          )}

          {step === 2 && (
            <SellerAppStep2Soliq
              platformStir={platformStir}
              platformName={platformName}
              copiedStir={copiedStir}
              onCopyStir={handleCopyStir}
              soliqVerifyResult={soliqVerifyResult}
            />
          )}

          {step === 3 && (
            <SellerAppStep3Bank
              bankAccountNumber={bankAccountNumber}
              bankMfo={bankMfo}
              bankName={bankName}
              bankAccountHolderName={bankAccountHolderName}
              contactPhone={contactPhone}
              companyName={companyName}
              stirData={stirData}
              cleanStir={cleanStir}
              commissionRate={commissionRate}
              onBankAccountNumberChange={(t) => setBankAccountNumber(formatBankAccountInput(t))}
              onBankMfoChange={(t) => setBankMfo(formatMfoInput(t))}
              onBankNameChange={setBankName}
              onBankAccountHolderNameChange={setBankAccountHolderName}
              onContactPhoneChange={setContactPhone}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Action Bar */}
      <SellerAppBottomBar
        step={step}
        bottomInset={insets.bottom}
        canGoToStep2={canGoToStep2}
        canSubmit={canSubmit}
        isVerifyingSoliq={isVerifyingSoliq}
        isSubmitting={submitMutation.isPending}
        onPrev={() => setStep((s) => ((s - 1) as 1 | 2))}
        onNext={() => {
          if (step === 1 && canGoToStep2) setStep(2);
          else if (step === 2) handleVerifyAndProceedToStep3();
          else if (step === 3 && canSubmit) submitMutation.mutate();
        }}
      />

      {/* Oferta Modal */}
      <SellerAppOfertaModal
        visible={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
        onAccept={() => {
          setOfertaAccepted(true);
          setShowOfertaModal(false);
        }}
        onOpenExternalPdf={handleOpenExternalPdf}
        resolvePdfUrl={resolvePdfUrl}
      />

      {/* Custom Success Modal */}
      <SellerAppSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)/profile');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
});
