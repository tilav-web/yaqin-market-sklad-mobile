import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Image as ExpoImage } from 'expo-image';
import {
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
  Alert,
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

  // Stepper State: 1 | 2 | 3
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Legal & STIR
  const [stir, setStir] = useState('');
  const [isCheckingStir, setIsCheckingStir] = useState(false);
  const [stirData, setStirData] = useState<StirData | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState(user?.name || '');
  const [legalAddress, setLegalAddress] = useState('');
  const [ofertaAccepted, setOfertaAccepted] = useState(false);
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [ofertaTab, setOfertaTab] = useState<'pdf' | 'text'>('pdf');

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

  const handleOpenOferta = (mode: 'pdf' | 'text' = 'pdf') => {
    setOfertaTab(mode);
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

  const handleCheckStir = async (targetStir?: string) => {
    const query = (targetStir || cleanStir).trim();
    if (query.length !== 9) {
      Alert.alert('Xatolik', "STIR 9 ta raqamdan iborat bo'lishi kerak");
      return;
    }

    if (/^(\d)\1{8}$/.test(query)) {
      Alert.alert('STIR topilmadi', "Bunday STIR bo'yicha davlat reyestrida faol tadbirkorlik subyekti topilmadi.");
      setStirData(null);
      return;
    }

    setIsCheckingStir(true);
    try {
      const res = await api.get<StirData>(`/sellers/lookup-stir/${query}`);
      setStirData(res.data);
      if (res.data.companyName) {
        setCompanyName(res.data.companyName);
        setBankAccountHolderName(res.data.companyName);
      }
      if (res.data.legalName) setLegalName(res.data.legalName);
      if (res.data.legalAddress) setLegalAddress(res.data.legalAddress);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (e) {
      setStirData(null);
      const errMsg = extractErrorMessage(e) || 'Ushbu STIR bo\'yicha faol korxona topilmadi';
      Alert.alert('STIR topilmadi', errMsg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    } finally {
      setIsCheckingStir(false);
    }
  };

  const handleVerifySoliq = async () => {
    if (!cleanStir || cleanStir.length !== 9) {
      Alert.alert('Xatolik', 'Avval STIR raqamini kiriting');
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
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        setSoliqConfirmed(false);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }
    } catch (e) {
      setSoliqConfirmed(false);
      const errMsg = extractErrorMessage(e) || 'Soliq bazasidan ma\'lumot olib bo\'lmadi';
      setSoliqVerifyResult({
        isAttached: false,
        message: errMsg,
      });
      Alert.alert('Soliq tekshiruv xatoligi', errMsg);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    } finally {
      setIsVerifyingSoliq(false);
    }
  };

  const handleStirChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 9);
    setStir(cleaned);
    if (stirData && cleaned !== stirData.stir) {
      setStirData(null);
    }
    if (cleaned.length === 9 && (!stirData || stirData.stir !== cleaned)) {
      handleCheckStir(cleaned);
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

  // Validation
  const canGoToStep2 = cleanStir.length === 9 && !!stirData && companyName.trim().length >= 2 && ofertaAccepted;
  const canGoToStep3 = soliqConfirmed;
  const rawAccount = bankAccountNumber.replace(/\s+/g, '');
  const rawMfo = bankMfo.replace(/\s+/g, '');
  const canSubmit = rawAccount.length === 20 && rawMfo.length === 5 && bankAccountHolderName.trim().length >= 2;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const nameParts = (legalName || user?.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Tadbirkor';
      const lastName = nameParts.slice(1).join(' ') || '';

      const res = await api.post('/sellers/apply', {
        firstName,
        lastName,
        stir: cleanStir,
        companyName: companyName.trim(),
        entityType: stirData?.entityType || 'MChJ',
        legalAddress: legalAddress.trim() || 'Qashqadaryo viloyati',
        bankAccountNumber: rawAccount,
        bankMfo: rawMfo,
        bankName: bankName.trim() || 'Bank',
        bankAccountHolderName: bankAccountHolderName.trim(),
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
      Alert.alert(
        "Arizangiz qabul qilindi! 🎉",
        "Hamkorlik arizangiz va bank hisob raqamingiz tekshirish uchun yuborildi. Operator tasdiqlagach, ilovada bemalol yangi do'konlaringizni ochishingiz mumkin.",
        [{ text: 'Tushunarli', onPress: () => router.replace('/(tabs)/profile') }],
      );
    },
    onError: (e) => {
      Alert.alert('Xatolik', extractErrorMessage(e));
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
                    <Text style={styles.heroTitle}>"TILAV" MChJ Bilan Hamkorlik</Text>
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
                  <View style={styles.charCounterBadge}>
                    <Text style={styles.charCounterText}>{cleanStir.length} / 9</Text>
                  </View>
                </View>

                <View style={styles.fullStirInputBox}>
                  <Search size={18} color={colors.text.hint} strokeWidth={2.2} />
                  <TextInput
                    style={styles.fullStirInput}
                    value={stir}
                    onChangeText={handleStirChange}
                    placeholder="305 123 456"
                    placeholderTextColor={colors.text.hint}
                    keyboardType="number-pad"
                    maxLength={9}
                  />
                  {isCheckingStir && (
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                  )}
                  {cleanStir.length === 9 && !isCheckingStir && !stirData && (
                    <Pressable
                      onPress={() => handleCheckStir()}
                      style={styles.miniCheckBtn}
                    >
                      <Text style={styles.miniCheckBtnText}>Tekshirish</Text>
                    </Pressable>
                  )}
                </View>

                {/* STIR Verified Result & Confirmed Details Form */}
                {stirData && (
                  <View style={styles.verifiedBox}>
                    <View style={styles.verifiedHeader}>
                      <ShieldCheck size={18} color="#16A34A" />
                      <Text style={styles.verifiedTitle}>STIR tasdiqlandi</Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>
                          {stirData.entityType} • {stirData.region}
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 10, marginTop: spacing.sm }}>
                      {/* Tashkilot Nomi */}
                      <View>
                        <Text style={styles.miniFieldLabel}>Tashkilot / Korxona nomi *</Text>
                        <View style={styles.editFieldBox}>
                          <Building2 size={16} color={colors.text.secondary} />
                          <TextInput
                            style={styles.editFieldInput}
                            value={companyName}
                            onChangeText={setCompanyName}
                            placeholder="MChJ yoki do'koningiz nomi"
                            placeholderTextColor={colors.text.hint}
                          />
                        </View>
                      </View>

                      {/* Rahbar F.I.SH */}
                      <View>
                        <Text style={styles.miniFieldLabel}>Rahbar / Tadbirkor F.I.SH</Text>
                        <View style={styles.editFieldBox}>
                          <User size={16} color={colors.text.secondary} />
                          <TextInput
                            style={styles.editFieldInput}
                            value={legalName}
                            onChangeText={setLegalName}
                            placeholder="Familiya Ism Sharifingiz"
                            placeholderTextColor={colors.text.hint}
                          />
                        </View>
                      </View>

                      {/* Yuridik Manzil */}
                      <View>
                        <Text style={styles.miniFieldLabel}>Yuridik manzil</Text>
                        <View style={styles.editFieldBox}>
                          <MapPin size={16} color={colors.text.secondary} />
                          <TextInput
                            style={styles.editFieldInput}
                            value={legalAddress}
                            onChangeText={setLegalAddress}
                            placeholder="Viloyat, shahar, ko'cha"
                            placeholderTextColor={colors.text.hint}
                          />
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
                    <Pressable onPress={() => handleOpenOferta('pdf')} hitSlop={6}>
                      <Text style={styles.ofertaLinkText}>
                        {platformConfig?.ofertaPdfUrl ? 'Rasmiy PDF shartnomani ilovada o\'qish ↗' : 'Shartnoma matnini to\'liq o\'qish ↗'}
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
              {/* Notice Banner */}
              <View style={styles.infoBanner}>
                <ShieldAlert size={22} color={colors.brand.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoBannerTitle}>my3.soliq.uz biriktiruvi shart</Text>
                  <Text style={styles.infoBannerDesc}>
                    O'zbekiston Respublikasi Soliq kodeksiga binoan, marketpleys orqali savdo qilish uchun soliq shaxsiy kabinetingizda "TILAV" MChJ ni komissioner sifatida qo'shishingiz lozim.
                  </Text>
                </View>
              </View>

              {/* High-Impact Copy STIR Card */}
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

              {/* 3 Step Guide Cards */}
              <View style={styles.guideCard}>
                <Text style={styles.guideCardTitle}>Qanday biriktiriladi? (3 qadam)</Text>

                <View style={styles.guideItem}>
                  <View style={styles.guideNumBadge}>
                    <Text style={styles.guideNumText}>1</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guideItemTitle}>Soliq kabinetiga kiring</Text>
                    <Text style={styles.guideItemDesc}>
                      my3.soliq.uz saytiga yoki "Soliq" ilovasiga ERI kalitingiz bilan kiring.
                    </Text>
                  </View>
                </View>

                <View style={styles.guideItem}>
                  <View style={styles.guideNumBadge}>
                    <Text style={styles.guideNumText}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guideItemTitle}>Komissionerlar bo'limini oching</Text>
                    <Text style={styles.guideItemDesc}>
                      Xizmatlar ➔ Elektron tijorat ➔ "Komissionerlar ro'yxati" sahifasiga o'ting.
                    </Text>
                  </View>
                </View>

                <View style={styles.guideItem}>
                  <View style={styles.guideNumBadge}>
                    <Text style={styles.guideNumText}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guideItemTitle}>TILAV MChJ ni biriktiring</Text>
                    <Text style={styles.guideItemDesc}>
                      "Komissioner qo'shish" tugmasini bosib, {platformStir} STIRni kiriting va saqlang.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => Linking.openURL('https://my3.soliq.uz')}
                  style={styles.openSoliqBtn}
                >
                  <Text style={styles.openSoliqText}>my3.soliq.uz saytini ochish</Text>
                  <ExternalLink size={16} color={colors.brand.primary} />
                </Pressable>
              </View>

              {/* Soliq Real-time Verification Box */}
              <View style={styles.formCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.inputLabel}>Soliq Biriktiruv Holati</Text>
                  {soliqVerifyResult?.isAttached ? (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>Tasdiqlangan</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusPill, { backgroundColor: colors.palette.gray100 }]}>
                      <Text style={[styles.statusPillText, { color: colors.text.secondary }]}>Kutilmoqda</Text>
                    </View>
                  )}
                </View>

                {/* Verification result card */}
                {soliqVerifyResult && (
                  <View
                    style={[
                      styles.soliqResultBox,
                      soliqVerifyResult.isAttached
                        ? styles.soliqResultSuccess
                        : styles.soliqResultWarning,
                    ]}
                  >
                    {soliqVerifyResult.isAttached ? (
                      <CheckCircle2 size={20} color="#16A34A" />
                    ) : (
                      <AlertTriangle size={20} color="#D97706" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.soliqResultTitle,
                          { color: soliqVerifyResult.isAttached ? '#15803D' : '#B45309' },
                        ]}
                      >
                        {soliqVerifyResult.isAttached
                          ? "Komissionerlik tasdiqlandi!"
                          : "Soliq biriktiruvi topilmadi"}
                      </Text>
                      <Text style={styles.soliqResultDesc}>
                        {soliqVerifyResult.message}
                      </Text>
                    </View>
                  </View>
                )}

                <Pressable
                  onPress={handleVerifySoliq}
                  disabled={isVerifyingSoliq}
                  style={[
                    styles.verifySoliqBtn,
                    soliqVerifyResult?.isAttached && styles.verifySoliqBtnSuccess,
                  ]}
                >
                  {isVerifyingSoliq ? (
                    <>
                      <ActivityIndicator size="small" color={colors.palette.white} />
                      <Text style={styles.verifySoliqBtnText}>Soliq bazasi tekshirilmoqda...</Text>
                    </>
                  ) : soliqVerifyResult?.isAttached ? (
                    <>
                      <ShieldCheck size={18} color={colors.palette.white} />
                      <Text style={styles.verifySoliqBtnText}>Qayta tekshirish (Tasdiqlangan)</Text>
                    </>
                  ) : (
                    <>
                      <Search size={18} color={colors.palette.white} />
                      <Text style={styles.verifySoliqBtnText}>Soliqdan biriktirishni tekshirish</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setSoliqConfirmed(!soliqConfirmed)}
                  style={styles.ofertaRow}
                >
                  <View
                    style={[
                      styles.customCheckbox,
                      soliqConfirmed && styles.customCheckboxActive,
                    ]}
                  >
                    {soliqConfirmed && (
                      <Check size={15} color={colors.palette.white} strokeWidth={3} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ofertaMainText, { fontWeight: '700' }]}>
                      Men "TILAV" MChJ ni soliq kabinetimda komissioner sifatida biriktirganimni tasdiqlayman.
                    </Text>
                  </View>
                </Pressable>
              </View>
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
                      placeholder='Masalan: "TILAV" MCHJ'
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
            else if (step === 2 && canGoToStep3) setStep(3);
            else if (step === 3 && canSubmit) submitMutation.mutate();
          }}
          disabled={
            (step === 1 && !canGoToStep2) ||
            (step === 2 && !canGoToStep3) ||
            (step === 3 && (!canSubmit || submitMutation.isPending))
          }
          style={[
            styles.nextButton,
            ((step === 1 && !canGoToStep2) ||
              (step === 2 && !canGoToStep3) ||
              (step === 3 && (!canSubmit || submitMutation.isPending))) &&
              styles.nextButtonDisabled,
          ]}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.palette.white} />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === 1 && 'Keyingi bosqich'}
                {step === 2 && 'Davom etish'}
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

            {/* View Mode Tabs */}
            <View style={styles.ofertaTabContainer}>
              <Pressable
                onPress={() => setOfertaTab('pdf')}
                style={[styles.ofertaTabBtn, ofertaTab === 'pdf' && styles.ofertaTabBtnActive]}
              >
                <Text style={[styles.ofertaTabText, ofertaTab === 'pdf' && styles.ofertaTabTextActive]}>
                  📄 Rasmiy Hujjat (PDF)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setOfertaTab('text')}
                style={[styles.ofertaTabBtn, ofertaTab === 'text' && styles.ofertaTabBtnActive]}
              >
                <Text style={[styles.ofertaTabText, ofertaTab === 'text' && styles.ofertaTabTextActive]}>
                  📝 Matn Ko'rinishi
                </Text>
              </Pressable>
            </View>

            {ofertaTab === 'pdf' ? (
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <View style={styles.pdfPagesContainer}>
                  <View style={styles.pdfTopBar}>
                    <Text style={styles.pdfPageNotice}>
                      O'zbekiston Respublikasi qonunlariga muvofiq rasmiy muhrlangan hujjat
                    </Text>
                    <Pressable onPress={handleOpenExternalPdf} style={styles.externalLinkBtn}>
                      <ExternalLink size={13} color={colors.brand.primary} />
                      <Text style={styles.externalLinkText}>Brauzerda</Text>
                    </Pressable>
                  </View>

                  <ExpoImage
                    source={{ uri: 'https://api.yaqin-market.uz/api/uploads/legal/oferta_page-1.png' }}
                    style={styles.pdfPageImage}
                    contentFit="contain"
                    priority="high"
                  />
                  <View style={styles.pdfPageBadge}>
                    <Text style={styles.pdfPageBadgeText}>1 / 2-sahifa</Text>
                  </View>

                  <ExpoImage
                    source={{ uri: 'https://api.yaqin-market.uz/api/uploads/legal/oferta_page-2.png' }}
                    style={[styles.pdfPageImage, { marginTop: 14 }]}
                    contentFit="contain"
                    priority="high"
                  />
                  <View style={styles.pdfPageBadge}>
                    <Text style={styles.pdfPageBadgeText}>2 / 2-sahifa (Muhr va Rekvizitlar)</Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <Text style={styles.modalText}>
                  {`ELEKTRON TIJORAT VOSITACHILIK (KOMISSIYA) OMMAVIY OFERTASI

Ushbu hujjat O‘zbekiston Respublikasi Fuqarolik kodeksining 367–370-moddalari hamda "Elektron tijorat to‘g‘risida"gi Qonuniga muvofiq rasmiy Ommaviy Oferta (shartnoma tuzish to‘g‘risidagi taklif) hisoblanadi.

1. UMUMIY QOIDALAR VA ATAMALAR
1.1. "Operator" (Platforma) — "TILAV" MCHJ (STIR: ${platformStir}), Yaqin Market elektron platformasi egasi va boshqaruvchisi.
1.2. "Hamkor" (Sotuvchi) — Yaqin Market platformasi orqali xaridorlarga tovar va mahsulotlarni sotish niyatida ushbu Ofertani to‘liq qabul qilgan (akseptlagan) yuridik shaxs, YaTT yoki o‘zini o‘zi band qilgan shaxs.
1.3. "Aksept" — Hamkor tomonidan mobil ilovada yoki veb-saytda Oferta shartlariga rozilik bildirilishi va my.soliq.uz portalida Operatorni vositachi (komissioner) sifatida biriktirilishi. Akseptlangan paytdan boshlab shartnoma to‘liq yuridik kuchga ega deb hisoblanadi.

2. SHARTNOMA PREDMETI
2.1. Operator o‘zining axborot-texnologik tizimi, mobil ilovasi va kuryerlik tarmog‘i orqali Hamkorning tovarlarini xaridorlarga onlayn sotish, buyurtmalarni qabul qilish, to‘lovlarni vositachilik asosida qabul qilish va yetkazib berish bo‘yicha xizmatlarni ko‘rsatadi.
2.2. Tovar xaridorga yetkazib berilgunga qadar uning egalik huquqi va to‘liq sifati uchun javobgarlik Hamkorda saqlanib qoladi.

3. XIZMAT HAQI (KOMISSIYA) VA HISOB-KITOBLAR TARTIBI
3.1. Operatorning vositachilik komissiyasi har bir muvaffaqiyatli yakunlangan buyurtmaning tovarlar umumiy qiymatidan ${commissionRate}% miqdorida belgilanadi.
3.2. Do‘kon ochish va ro‘yxatdan o‘tish mutlaqo bepul (0 so‘m). Majburiy boshlang‘ich depozit talab etilmaydi.
3.3. Savdo tushumlari Operator tomonidan 12% vositachilik komissiyasi ushlab qolingan holda, Hamkor ko‘rsatgan bank hisob raqamiga yoki milliy bank kartasiga (Uzcard/Humo) haftalik / doimiy rejimda o‘tkazib beriladi.

4. BALANS VA QARZDORLIK INTIZOMI
4.1. Hamkorning platformadagi Shaxsiy Balansi real vaqt rejimida yuritiladi.
4.2. Xaridor naqd pulda to‘lagan buyurtmalar bo‘yicha Operatorning 12% komissiyasi Hamkorning balansiga qarz sifatida yoziladi.
4.3. Agar Hamkorning balansi manfiy (qarz) holatga tushsa, qarzni 3 (uch) kalendar kuni ichida to‘ldirishi shart. Qarz o‘z vaqtida so‘ndirilmasa, tizim Hamkorning do‘kon faoliyatini avtomatik ravishda vaqtincha to‘xtatadi (deaktivatsiya qiladi).

5. TOVAR SIFATI, NARXLAR VA BUYURTMALARNI TAYYORLASH
5.1. Hamkor do‘kondagi amaldagi real narx va tovar qoldig‘i ilovadagi vitrina bilan 100% bir xil bo‘lishini ta'minlaydi.
5.2. Sotuvga qo‘yiladigan barcha tovarlar qonuniy, standartlarga muvofiq, xavfsiz va yaroqlilik muddati buzilmagan bo‘lishi shart.
5.3. Hamkor ilovadan buyurtma kelib tushganda uni belgilangan vaqtda sifatli qadoqlab, kuryerga topshirishga tayyor holga keltiradi. Tovar yo‘qligi sababli asossiz bekor qilingan buyurtmalar uchun do‘kon reytingi tushiriladi va takrorlanganda do‘kon faoliyati cheklanadi.

6. MAHSULOTNI QAYTARISH VA MODDIY JAVOBGARLIK
6.1. Xaridor tomonidan olingan mahsulot yaroqlilik muddati o‘tgan, sifatsiz, buzilgan yoki buyurtmaga nomuvofiq (adashib noto‘g‘ri) yuborilganligi aniqlansa — tovar summasi xaridorga to‘liq qaytariladi hamda yetkazib berish xarajati Hamkor hisobidan qoplanadi (balansidan ushlab qolinadi).
6.2. O‘zbekiston Respublikasining "Iste'molchilar huquqlarini himoya qilish to‘g‘risida"gi Qonuniga muvofiq, sifati buzilmagan va yaroqli bo‘lgan oziq-ovqat tovarlari asossiz qaytarilmaydi.

7. SOLIQ VA FISKAL MAJBURIYATLAR
7.1. O‘zbekiston Respublikasi Soliq kodeksining 463-moddasiga muvofiq, Hamkor my3.soliq.uz davlat soliq portalida Operatorni ("TILAV" MCHJ, STIR: ${platformStir}) o‘ziga rasmiy vositachi (komissioner) sifatida biriktirishi shart.
7.2. Operator o‘ziga tegishli 12% vositachilik daromadidan qonunchilikda belgilangan tartibda soliq to‘laydi. Hamkor o‘zining tovar aylanmasi bo‘yicha tanlagan soliq rejimiga muvofiq mustaqil hisobot beradi va soliq to‘laydi.
7.3. Har bir sotilgan tovar bo‘yicha O‘zbekiston Respublikasi Davlat Soliq Qo‘mitasi talablariga mos keluvchi QR-kodli elektron fiskal chek yaratilishi ta'minlanadi.

8. SHARTNOMANING AMAL QILISHI VA BEKOR QILINISHI
8.1. Ushbu shartnoma Hamkor tomonidan Aksept qilingan kundan boshlab muddatsiz tuziladi.
8.2. Hamkor istalgan vaqtda do‘kon faoliyatini to‘xtatish yoki shartnomani bekor qilish tashabbusi bilan chiqish huquqiga ega. Barcha faol buyurtmalar yakunlanib, tomonlar o‘rtasida o‘zaro hisob-kitoblar to‘liq amalga oshirilgach (1-3 ish kuni ichida), hisobdagi qoldiq mablag‘ Hamkorga to‘lab beriladi va do‘kon yopiladi.
8.3. Hamkor tomonidan qonunbuzarlik, kontrafakt yoki qalloblik holatlari sodir etilganda, Operator shartnomani bir tomonlama darhol bekor qilish va qonuniy organlarga murojaat qilish huquqini o‘zida saqlab qoladi.

9. REKVIZITLAR:
Operator: "TILAV" MCHJ
STIR: ${platformStir}
Brend: Yaqin Market
Aloqa: ${platformConfig?.supportPhone || '+998993256685'}
Veb-sayt: yaqin-market.uz`}
                </Text>
              </ScrollView>
            )}

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
  fullStirInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: spacing.md,
    gap: spacing.sm,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
    flex: 1,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  miniFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  editFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.palette.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: spacing.sm,
    height: 42,
    gap: spacing.xs,
  },
  editFieldInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '600',
    paddingVertical: 0,
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
  guideCard: {
    backgroundColor: colors.palette.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.lg,
    ...shadow.xs,
  },
  guideCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  guideNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guideNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  guideItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  guideItemDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  openSoliqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.palette.gray50,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  openSoliqText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  soliqResultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  soliqResultSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  soliqResultWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  soliqResultTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  soliqResultDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  verifySoliqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    paddingVertical: 13,
    borderRadius: radius.xl,
    ...shadow.xs,
  },
  verifySoliqBtnSuccess: {
    backgroundColor: '#16A34A',
  },
  verifySoliqBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.palette.white,
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
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
    ...shadow.sm,
  },
  nextButtonDisabled: {
    opacity: 0.45,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.palette.white,
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
  ofertaTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.palette.gray100,
    borderRadius: radius.lg,
    padding: 3,
    gap: 4,
    marginBottom: spacing.xs,
  },
  ofertaTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  ofertaTabBtnActive: {
    backgroundColor: colors.palette.white,
    ...shadow.xs,
  },
  ofertaTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  ofertaTabTextActive: {
    fontWeight: '800',
    color: colors.brand.primary,
  },
  modalBody: {
    flex: 1,
  },
  modalText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  pdfPagesContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  pdfTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.palette.gray50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.sm,
    gap: 8,
  },
  pdfPageNotice: {
    flex: 1,
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 15,
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
});
