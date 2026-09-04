import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Image as ExpoImage } from 'expo-image';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Info,
  Landmark,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, shadow, spacing } from '@/theme';

interface StirData {
  stir: string;
  companyName: string;
  legalName: string;
  entityType: string;
  legalAddress: string;
  region?: string;
  status: 'active' | 'inactive';
  vatPayer: boolean;
}

export default function SellerApplicationScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

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
  const [soliqConfirmed, setSoliqConfirmed] = useState(false);
  const [copiedStir, setCopiedStir] = useState(false);
  const [isVerifyingSoliq, setIsVerifyingSoliq] = useState(false);
  const [soliqVerifyResult, setSoliqVerifyResult] = useState<{
    isAttached: boolean;
    message: string;
    attachedAt?: string;
  } | null>(null);

  // Step 3: Bank Account & Contact
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankMfo, setBankMfo] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');

  // Platform info fetched dynamically from admin settings via backend
  const { data: platformConfig } = useQuery({
    queryKey: ['platform-config'],
    queryFn: async () => {
      const res = await api.get<{
        platformStir: string;
        platformName: string;
        commissionRate: number;
        ofertaTitle: string;
        ofertaUrl: string;
        ofertaPdfUrl?: string;
        supportPhone: string;
      }>('/sellers/platform-config');
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

  // Auto trigger STIR check when 9 digits entered
  const cleanStir = stir.replace(/\D/g, '').slice(0, 9);

  // Real-time STIR validatsiyasi (yozish jarayonida qizil ko'rsatish)
  const validateStirRealtime = (val: string): string | null => {
    if (!val || val.length === 0) return null;
    const first = val[0];
    if (!['2', '3', '4', '5', '6'].includes(first)) {
      return "STIR 2, 3 (yuridik shaxs) yoki 4, 5, 6 (YaTT) bilan boshlanishi shart";
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
        return "Davlat soliq reyestrida bunday STIR mavjud emas";
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
      setStirError("STIR 9 ta raqamdan iborat bo'lishi kerak");
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
      toast.success("STIR davlat reyestridan tasdiqlandi");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (e) {
      setStirData(null);
      const errMsg =
        extractErrorMessage(e) ||
        "Ushbu STIR bo'yicha davlat soliq reyestrida faol tadbirkorlik subyekti topilmadi";
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
      toast.warning('Avval STIR raqamini kiriting');
      return;
    }

    setIsVerifyingSoliq(true);
    try {
      const res = await api.get<{
        isAttached: boolean;
        message: string;
        attachedAt?: string;
      }>(`/sellers/check-commissioner/${cleanStir}`);

      setSoliqVerifyResult(res.data);
      if (res.data.isAttached) {
        setSoliqConfirmed(true);
        toast.success("Platforma komissioner sifatida tasdiqlandi!");
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        // Successfully verified commissioner! Proceed directly to Step 3!
        setStep(3);
      } else {
        setSoliqConfirmed(false);
        toast.warning(res.data.message || "Platforma hali komissioner qilib biriktirilmagan");
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }
    } catch (e) {
      setSoliqConfirmed(false);
      const errMsg = extractErrorMessage(e) || "Soliq bazasidan tekshirib bo'lmadi";
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

  // Validation: Step 2ga faqat Soliq bazasidan tasdiqlangan rasmiy korxona nomiga ega bo'lgan va ofertaga rozilik bergan foydalanuvchi o'ta oladi
  const canGoToStep2 =
    cleanStir.length === 9 &&
    !!stirData &&
    stirData.status === 'active' &&
    !!stirData.companyName &&
    stirData.companyName.trim().length >= 2 &&
    ofertaAccepted;
  const canGoToStep3 = soliqConfirmed;
  const rawAccount = bankAccountNumber.replace(/\s+/g, '');
  const rawMfo = bankMfo.replace(/\s+/g, '');
  const canSubmit = rawAccount.length === 20 && rawMfo.length === 5 && bankAccountHolderName.trim().length >= 2;

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

      {/* ================= TOP CUSTOM HEADER ================= */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (step > 1) {
              setStep((s) => ((s - 1) as 1 | 2));
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Hamkorlik & Do'kon</Text>
          <Text style={styles.headerSubtitle}>
            {step === 1 && '1/3: Yuridik & STIR'}
            {step === 2 && '2/3: my3.soliq.uz'}
            {step === 3 && '3/3: Bank Hisob Raqami'}
          </Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}/3</Text>
        </View>
      </View>

      {/* ================= 3-SEGMENT PROGRESS BAR ================= */}
      <View style={styles.progressContainer}>
        <View style={styles.progressSegments}>
          <View style={[styles.segment, styles.segmentActive]} />
          <View style={[styles.segment, step >= 2 && styles.segmentActive]} />
          <View style={[styles.segment, step >= 3 && styles.segmentActive]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, step === 1 && styles.progressLabelActive]}>
            STIR & Oferta
          </Text>
          <Text style={[styles.progressLabel, step === 2 && styles.progressLabelActive]}>
            Soliq biriktiruvi
          </Text>
          <Text style={[styles.progressLabel, step === 3 && styles.progressLabelActive]}>
            Bank Hisob Raqam
          </Text>
        </View>
      </View>

      {/* ================= STEP CONTENT SCROLL ================= */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===================== STEP 1: STIR & OFERTA ===================== */}
          {step === 1 && (
            <View style={styles.stepWrapper}>
              {/* Hero Program Card */}
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.heroIconBox}>
                    <Building2 size={24} color={colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroTitle}>{platformName} Bilan Hamkorlik</Text>
                    <Text style={styles.heroDesc}>
                      Yaqin Market platformasida o'z do'koningizni ochish va tovarlaringizni sotish uchun arizani to'ldiring.
                    </Text>
                  </View>
                </View>
              </View>

              {/* STIR Input Card */}
              <View style={styles.formCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.inputLabel}>STIR / INN raqamingiz</Text>
                  <View
                    style={[
                      styles.charCounterBadge,
                      !!stirError && styles.charCounterBadgeError,
                      !!stirData && styles.charCounterBadgeSuccess,
                    ]}
                  >
                    <Text
                      style={[
                        styles.charCounterText,
                        !!stirError && styles.charCounterTextError,
                        !!stirData && styles.charCounterTextSuccess,
                      ]}
                    >
                      {cleanStir.length} / 9
                    </Text>
                  </View>
                </View>

                {/* Real-time Dynamic Input Box (to'g'ri yozilmasa qizil, to'g'ri bo'lsa yashil) */}
                <View
                  style={[
                    styles.fullStirInputBox,
                    !!stirError && styles.fullStirInputBoxError,
                    !!stirData && styles.fullStirInputBoxSuccess,
                  ]}
                >
                  {isCheckingStir ? (
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                  ) : stirData ? (
                    <CheckCircle2 size={20} color="#16A34A" strokeWidth={2.4} />
                  ) : stirError ? (
                    <AlertTriangle size={20} color="#EF4444" strokeWidth={2.4} />
                  ) : (
                    <Search size={18} color={colors.text.hint} strokeWidth={2.2} />
                  )}

                  <TextInput
                    style={[
                      styles.fullStirInput,
                      !!stirError && styles.fullStirInputError,
                      !!stirData && styles.fullStirInputSuccess,
                    ]}
                    value={stir}
                    onChangeText={handleStirChange}
                    placeholder="305 123 456"
                    placeholderTextColor={colors.text.hint}
                    keyboardType="number-pad"
                    maxLength={9}
                  />

                  {cleanStir.length === 9 && !isCheckingStir && !stirData && (
                    <Pressable
                      onPress={() => handleCheckStir()}
                      style={[
                        styles.miniCheckBtn,
                        !!stirError && { backgroundColor: '#EF4444' },
                      ]}
                    >
                      <Text style={styles.miniCheckBtnText}>
                        {stirError ? 'Qayta tekshirish' : 'Tekshirish'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Real-time Error Row */}
                {!!stirError && (
                  <View style={styles.realtimeErrorRow}>
                    <AlertCircle size={15} color="#DC2626" style={{ marginTop: 1 }} />
                    <Text style={styles.realtimeErrorText}>{stirError}</Text>
                  </View>
                )}

                {/* Real-time Typing Hint */}
                {cleanStir.length > 0 && cleanStir.length < 9 && !stirError && (
                  <View style={styles.realtimeHintRow}>
                    <Info size={14} color={colors.text.hint} style={{ marginTop: 1 }} />
                    <Text style={styles.realtimeHintText}>
                      {cleanStir.startsWith('2') || cleanStir.startsWith('3')
                        ? 'Yuridik shaxs (MChJ/XK) STIRi — 9 ta raqam'
                        : 'YaTT (Yakka tartibdagi tadbirkor) STIRi — 9 ta raqam'}
                    </Text>
                  </View>
                )}

                {/* STIR Verified Result & Confirmed Official Details (Read-Only: qo'lda o'zgartirilmaydi) */}
                {stirData && (
                  <View style={styles.verifiedBox}>
                    <View style={styles.verifiedHeader}>
                      <ShieldCheck size={20} color="#16A34A" />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.verifiedTitle}>STIR tasdiqlandi</Text>
                        <Text style={styles.verifiedSubtitle}>
                          Davlat soliq reyestridan olindi
                        </Text>
                      </View>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>
                          {stirData.entityType} • Faol
                        </Text>
                      </View>
                    </View>

                    <View style={styles.verifiedDetailsContainer}>
                      {/* Tashkilot Nomi */}
                      <View style={styles.readOnlyRow}>
                        <Building2
                          size={16}
                          color={colors.brand.primary}
                          style={styles.readOnlyIcon}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.readOnlyLabel}>Tashkilot / Korxona nomi</Text>
                          <Text style={styles.readOnlyValueBold}>
                            {stirData.companyName}
                          </Text>
                        </View>
                      </View>

                      {/* Rahbar F.I.SH */}
                      {!!stirData.legalName && (
                        <View style={styles.readOnlyRow}>
                          <User
                            size={16}
                            color={colors.text.secondary}
                            style={styles.readOnlyIcon}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.readOnlyLabel}>Rahbar / Tadbirkor</Text>
                            <Text style={styles.readOnlyValue}>
                              {stirData.legalName}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Yuridik Manzil */}
                      {!!(stirData.legalAddress || stirData.region) && (
                        <View style={styles.readOnlyRow}>
                          <MapPin
                            size={16}
                            color={colors.text.secondary}
                            style={styles.readOnlyIcon}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.readOnlyLabel}>Yuridik manzil</Text>
                            <Text style={styles.readOnlyValue}>
                              {stirData.legalAddress || stirData.region}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Holat va QQS belgilari */}
                      <View style={styles.taxStatusBadges}>
                        <View style={styles.greenBadge}>
                          <CheckCircle2 size={13} color="#15803D" />
                          <Text style={styles.greenBadgeText}>Davlat reyestrida faol</Text>
                        </View>
                        <View style={styles.neutralBadge}>
                          <Text style={styles.neutralBadgeText}>
                            {stirData.vatPayer ? 'QQS to\'lovchisi' : 'QQS to\'lovchisi emas'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Oferta Acceptance Card */}
              <View style={styles.formCard}>
                <Pressable
                  onPress={() => setOfertaAccepted(!ofertaAccepted)}
                  style={styles.ofertaRow}
                >
                  <View
                    style={[
                      styles.customCheckbox,
                      ofertaAccepted && styles.customCheckboxActive,
                    ]}
                  >
                    {ofertaAccepted && (
                      <Check size={15} color={colors.palette.white} strokeWidth={3} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ofertaMainText}>
                      Men {platformName}ning ommaviy hamkorlik ofertasi va {commissionRate}% vositachilik shartlariga roziman.
                    </Text>
                    <Pressable onPress={handleOpenOferta} hitSlop={6}>
                      <Text style={styles.ofertaLinkText}>
                        Rasmiy PDF shartnomani ilovada o'qish ↗
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          {/* ===================== STEP 2: SOLIQ BIRIKTIRUVI ===================== */}
          {step === 2 && (
            <View style={styles.stepWrapper}>
              {/* Clean Concise Header */}
              <View style={styles.cleanStepHeader}>
                <View style={styles.cleanStepIconBox}>
                  <ShieldCheck size={28} color={colors.brand.primary} />
                </View>
                <Text style={styles.cleanStepTitle}>Soliq kabinetida biriktirish</Text>
                <Text style={styles.cleanStepSubtitle}>
                  my3.soliq.uz portaliga kiring va platformani o'zingizga rasmiy komissioner (vositachi) sifatida qo'shing.
                </Text>
              </View>

              {/* High-Impact Operator STIR Card */}
              <View style={styles.platformStirCard}>
                <View style={styles.platformStirHeader}>
                  <Sparkles size={16} color="#FDECEA" />
                  <Text style={styles.platformStirTag}>OPERATOR STIR RAQAMI</Text>
                </View>

                <Text style={styles.platformStirNumber}>{platformStir}</Text>
                <Text style={styles.platformStirOrg}>{platformName}</Text>

                <Pressable
                  onPress={handleCopyStir}
                  style={[styles.copyStirButton, copiedStir && styles.copyStirButtonSuccess]}
                >
                  {copiedStir ? (
                    <>
                      <CheckCircle2 size={18} color={colors.palette.white} />
                      <Text style={styles.copyStirBtnText}>STIR nusxalandi!</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={18} color={colors.palette.white} />
                      <Text style={styles.copyStirBtnText}>STIR raqamini nusxalash</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Direct Link to Soliq */}
              <Pressable
                onPress={() => Linking.openURL('https://my3.soliq.uz')}
                style={styles.directSoliqLinkCard}
              >
                <View style={styles.directSoliqLinkLeft}>
                  <Text style={styles.directSoliqLinkTitle}>my3.soliq.uz saytini ochish</Text>
                  <Text style={styles.directSoliqLinkDesc}>
                    Xizmatlar ➔ Elektron tijorat ➔ Komissioner qo'shish
                  </Text>
                </View>
                <ExternalLink size={20} color={colors.brand.primary} />
              </Pressable>

              {/* Dynamic Status Notification */}
              {soliqVerifyResult && !soliqVerifyResult.isAttached && (
                <View style={styles.soliqFailedCard}>
                  <AlertTriangle size={22} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.soliqFailedTitle}>Biriktiruv topilmadi</Text>
                    <Text style={styles.soliqFailedDesc}>
                      {soliqVerifyResult.message ||
                        `my3.soliq.uz tizimida platforma (${platformStir}) komissioner sifatida topilmadi. Iltimos, Soliq kabinetingizga kirib komissioner qo'shing va qayta bosing.`}
                    </Text>
                  </View>
                </View>
              )}

              {soliqVerifyResult?.isAttached && (
                <View style={styles.soliqSuccessCard}>
                  <CheckCircle2 size={22} color="#16A34A" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.soliqSuccessTitle}>Komissionerlik tasdiqlandi!</Text>
                    <Text style={styles.soliqSuccessDesc}>
                      {soliqVerifyResult.message}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ===================== STEP 3: BANK HISOB RAQAMI & YAKUN ===================== */}
          {step === 3 && (
            <View style={styles.stepWrapper}>
              {/* Virtual Bank Account Mockup */}
              <View style={styles.bankCardMockup}>
                <View style={styles.bankCardTop}>
                  <View style={styles.bankChip}>
                    <Landmark size={22} color="#ffffff" strokeWidth={2.2} />
                  </View>
                  <View style={styles.cardTypeBadge}>
                    <Text style={styles.cardTypeText}>
                      {bankMfo ? `MFO: ${bankMfo}` : 'B2B BANK HISOB RAQAM'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.bankCardDigits} numberOfLines={1}>
                  {bankAccountNumber ? bankAccountNumber : '2020 8000 •••• •••• ••••'}
                </Text>

                <View style={styles.bankCardBottom}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.bankCardHolderLabel}>HISOB EGASI (TASHKILOT)</Text>
                    <Text style={styles.bankCardHolderVal} numberOfLines={1}>
                      {bankAccountHolderName || companyName || 'KORXONA NOMI'}
                    </Text>
                  </View>
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutBadgeText}>0% Komissiya</Text>
                  </View>
                </View>
              </View>

              {/* Bank Account Inputs Form */}
              <View style={styles.formCard}>
                <Text style={styles.cardSectionHeading}>Bank hisob-kitob rekvizitlari</Text>
                <Text style={styles.formCardSub}>
                  Savdo tushumlari to'g'ridan-to'g'ri korxonangizning bank hisob raqamiga 0% komissiya bilan o'tkazib beriladi.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    20 xonali Bank Hisob Raqami (Hisob-kitob hisobvarag'i) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <Hash size={18} color={colors.text.hint} />
                    <TextInput
                      style={styles.textInput}
                      value={bankAccountNumber}
                      onChangeText={(t) => setBankAccountNumber(formatBankAccountInput(t))}
                      placeholder="2020 8000 0000 0000 0001"
                      placeholderTextColor={colors.text.hint}
                      keyboardType="number-pad"
                      maxLength={24}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>
                      Bank MFO kodi <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.inputWithIcon}>
                      <Building2 size={18} color={colors.text.hint} />
                      <TextInput
                        style={styles.textInput}
                        value={bankMfo}
                        onChangeText={(t) => setBankMfo(formatMfoInput(t))}
                        placeholder="00444"
                        placeholderTextColor={colors.text.hint}
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1.5 }]}>
                    <Text style={styles.inputLabel}>Bank nomi / filiali</Text>
                    <TextInput
                      style={styles.textInputFull}
                      value={bankName}
                      onChangeText={setBankName}
                      placeholder="Masalan: AT Xalq Banki"
                      placeholderTextColor={colors.text.hint}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Hisob egasi / Korxona nomi <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWithIcon}>
                    <User size={18} color={colors.text.hint} />
                    <TextInput
                      style={styles.textInput}
                      value={bankAccountHolderName}
                      onChangeText={setBankAccountHolderName}
                      placeholder={companyName || 'Korxona yoki YaTT nomi'}
                      placeholderTextColor={colors.text.hint}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bog'lanish telefon raqami</Text>
                  <TextInput
                    style={styles.textInputFull}
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="+998 90 123 45 67"
                    placeholderTextColor={colors.text.hint}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Summary Receipt Card */}
              <View style={styles.receiptCard}>
                <Text style={styles.receiptTitle}>Ariza xulosasi</Text>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Tashkilot:</Text>
                  <Text style={styles.receiptVal} numberOfLines={1}>
                    {companyName || stirData?.companyName || '—'}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>STIR raqami:</Text>
                  <Text style={styles.receiptVal}>{cleanStir}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Bank Hisob Raqami:</Text>
                  <Text style={styles.receiptVal} numberOfLines={1}>
                    {bankAccountNumber ? `${bankAccountNumber.slice(0, 10)}...` : '—'}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Bank MFO:</Text>
                  <Text style={styles.receiptVal}>{bankMfo || '—'}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Soliq integratsiyasi:</Text>
                  <Text style={[styles.receiptVal, { color: '#16A34A' }]}>✅ Biriktirilgan</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Vositachilik to'lovi:</Text>
                  <Text style={styles.receiptVal}>{commissionRate}% (sotilganda)</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= FIXED BOTTOM ACTION BAR ================= */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {step > 1 && (
          <Pressable
            onPress={() => setStep((s) => ((s - 1) as 1 | 2))}
            style={styles.prevButton}
            hitSlop={8}
          >
            <ArrowLeft size={18} color={colors.text.primary} strokeWidth={2.2} />
            <Text style={styles.prevBtnText}>Orqaga</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            if (step === 1 && canGoToStep2) setStep(2);
            else if (step === 2) handleVerifyAndProceedToStep3();
            else if (step === 3 && canSubmit) submitMutation.mutate();
          }}
          disabled={
            (step === 1 && !canGoToStep2) ||
            (step === 2 && isVerifyingSoliq) ||
            (step === 3 && (!canSubmit || submitMutation.isPending))
          }
          style={[
            styles.nextButton,
            ((step === 1 && !canGoToStep2) ||
              (step === 2 && isVerifyingSoliq) ||
              (step === 3 && (!canSubmit || submitMutation.isPending))) &&
              styles.nextButtonDisabled,
          ]}
        >
          {submitMutation.isPending || (step === 2 && isVerifyingSoliq) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color={colors.palette.white} />
              <Text style={styles.nextBtnText} numberOfLines={1}>
                {step === 2 ? 'Tekshirilmoqda...' : 'Yuborilmoqda...'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.nextBtnText} numberOfLines={1}>
                {step === 1 && 'Keyingi bosqich'}
                {step === 2 && 'Tekshirish'}
                {step === 3 && 'Arizani yuborish'}
              </Text>
              <ArrowRight size={18} color={colors.palette.white} strokeWidth={2.4} />
            </>
          )}
        </Pressable>
      </View>

      {/* ================= OFERTA FULL MODAL ================= */}
      <Modal visible={showOfertaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <FileText size={20} color={colors.brand.primary} />
                <Text style={styles.modalTitle}>Hamkorlik Ommaviy Ofertasi</Text>
              </View>
              <Pressable onPress={() => setShowOfertaModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={colors.text.secondary} />
              </Pressable>
            </View>

            <View style={styles.pdfHeaderRow}>
              <Text style={styles.pdfHeaderNotice}>
                O'zbekiston Respublikasi qonunlariga muvofiq rasmiy ommaviy shartnoma
              </Text>
              <Pressable onPress={handleOpenExternalPdf} style={styles.externalLinkBtn}>
                <ExternalLink size={13} color={colors.brand.primary} />
                <Text style={styles.externalLinkText}>PDF fayl ↗</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <View style={styles.pdfPagesContainer}>
                <ExpoImage
                  source={{
                    uri: resolvePdfUrl('/api/uploads/legal/oferta_page-1.png?v=20260904_2'),
                  }}
                  style={styles.pdfPageImage}
                  contentFit="contain"
                  priority="high"
                />
                <View style={styles.pdfPageBadge}>
                  <Text style={styles.pdfPageBadgeText}>1 / 2-sahifa</Text>
                </View>

                <ExpoImage
                  source={{
                    uri: resolvePdfUrl('/api/uploads/legal/oferta_page-2.png?v=20260904_2'),
                  }}
                  style={[styles.pdfPageImage, { marginTop: 14 }]}
                  contentFit="contain"
                  priority="high"
                />
                <View style={styles.pdfPageBadge}>
                  <Text style={styles.pdfPageBadgeText}>2 / 2-sahifa (Tomonlar rekvizitlari va imzo)</Text>
                </View>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => {
                setOfertaAccepted(true);
                setShowOfertaModal(false);
              }}
              style={styles.modalAcceptBtn}
            >
              <Check size={18} color={colors.palette.white} />
              <Text style={styles.modalAcceptText}>Shartlarni qabul qilaman</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= CUSTOM SUCCESS MODAL (OS Alert o'rniga) ================= */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => router.replace('/(tabs)/profile')}
      >
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={42} color="#16A34A" strokeWidth={2.4} />
            </View>

            <Text style={styles.successModalTitle}>Arizangiz qabul qilindi! 🎉</Text>
            <Text style={styles.successModalSubtitle}>
              Hamkorlik arizangiz va bank hisob raqamingiz tekshirish uchun yuborildi. Operator tasdiqlagach, ilovada bemalol yangi do'konlaringizni ochishingiz mumkin.
            </Text>

            <Pressable
              style={styles.successModalBtn}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)/profile');
              }}
            >
              <Text style={styles.successModalBtnText}>Tushunarli</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  stepWrapper: {
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.palette.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    ...shadow.xs,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: colors.palette.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
    ...shadow.xs,
  },
  formCardSub: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
    marginTop: -spacing.xs,
  },
  requiredStar: {
    color: '#EF4444',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  charCounterBadge: {
    backgroundColor: colors.palette.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  charCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  fullStirInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.palette.gray50,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
  },
  fullStirInputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  fullStirInputBoxSuccess: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  fullStirInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
  },
  fullStirInputError: {
    color: '#B91C1C',
  },
  fullStirInputSuccess: {
    color: '#15803D',
  },
  charCounterBadgeError: {
    backgroundColor: '#FEE2E2',
  },
  charCounterBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  charCounterTextError: {
    color: '#DC2626',
    fontWeight: '800',
  },
  charCounterTextSuccess: {
    color: '#15803D',
    fontWeight: '800',
  },
  realtimeErrorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 2,
  },
  realtimeErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    flex: 1,
    lineHeight: 16,
  },
  realtimeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  realtimeHintText: {
    fontSize: 12,
    color: colors.text.hint,
    fontWeight: '500',
  },
  miniCheckBtn: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  miniCheckBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.palette.white,
  },
  verifiedBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    padding: spacing.md,
    gap: spacing.sm,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  verifiedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  verifiedSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
    marginTop: 1,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  verifiedDetailsContainer: {
    gap: 8,
    marginTop: 2,
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.palette.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  readOnlyIcon: {
    marginTop: 2,
  },
  readOnlyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.hint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  readOnlyValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  readOnlyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  taxStatusBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  greenBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  neutralBadge: {
    backgroundColor: colors.palette.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  neutralBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  verifiedContent: {
    gap: 6,
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
    flex: 1,
  },
  verifiedText: {
    fontSize: 12,
    color: colors.text.secondary,
    flex: 1,
  },
  ofertaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  customCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  customCheckboxActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  ofertaMainText: {
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 19,
  },
  ofertaLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.primary,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand.primary,
    marginBottom: 4,
  },
  infoBannerDesc: {
    fontSize: 12,
    color: colors.palette.redDarker,
    lineHeight: 18,
  },
  platformStirCard: {
    backgroundColor: '#1E1B18',
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadow.md,
  },
  platformStirHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  platformStirTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBD9D5',
    letterSpacing: 1.2,
  },
  platformStirNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.palette.white,
    letterSpacing: 3,
    marginVertical: 4,
  },
  platformStirOrg: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DEDAD6',
    marginBottom: spacing.md,
  },
  copyStirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  copyStirButtonSuccess: {
    backgroundColor: '#16A34A',
  },
  copyStirBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.palette.white,
  },
  cleanStepHeader: {
    alignItems: 'center',
    textAlign: 'center',
    paddingVertical: spacing.md,
    gap: 8,
  },
  cleanStepIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cleanStepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  cleanStepSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  directSoliqLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.palette.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...shadow.xs,
  },
  directSoliqLinkLeft: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 4,
  },
  directSoliqLinkTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  directSoliqLinkDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  soliqFailedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.xs,
  },
  soliqFailedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 4,
  },
  soliqFailedDesc: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  soliqSuccessCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.xs,
  },
  soliqSuccessTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
    marginBottom: 4,
  },
  soliqSuccessDesc: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  bankCardMockup: {
    backgroundColor: '#1C1917',
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    height: 195,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#383431',
    ...shadow.md,
  },
  bankCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankChip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    padding: 3,
  },
  bankChipLines: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D97706',
  },
  cardTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  cardTypeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.palette.white,
    letterSpacing: 1,
  },
  bankCardDigits: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.palette.white,
    letterSpacing: 3,
  },
  bankCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bankCardHolderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A8A29E',
    letterSpacing: 1,
  },
  bankCardHolderVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.palette.white,
    maxWidth: 180,
  },
  payoutBadge: {
    backgroundColor: '#15803D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  payoutBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.palette.white,
  },
  cardSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  inputGroup: {
    gap: 6,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.palette.gray50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  textInputFull: {
    backgroundColor: colors.palette.gray50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  receiptCard: {
    backgroundColor: colors.palette.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.sm,
    ...shadow.xs,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptKey: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    maxWidth: '60%',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.palette.white,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    padding: spacing.lg,
    height: '92%',
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.palette.gray50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.xs,
    gap: 8,
  },
  pdfHeaderNotice: {
    flex: 1,
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 15,
  },
  modalBody: {
    flex: 1,
  },
  pdfPagesContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  externalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  externalLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  pdfPageImage: {
    width: '100%',
    aspectRatio: 1654 / 2339,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  pdfPageBadge: {
    backgroundColor: colors.palette.gray100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: 6,
  },
  pdfPageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  modalAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
    marginTop: spacing.xs,
  },
  modalAcceptText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.palette.white,
  },
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.palette.white,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.md,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  successModalSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  successModalBtn: {
    width: '100%',
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  successModalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.palette.white,
  },
});
