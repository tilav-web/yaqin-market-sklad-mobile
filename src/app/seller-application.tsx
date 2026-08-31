import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
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

  // Step 2: Soliq biriktiruvi
  const [soliqConfirmed, setSoliqConfirmed] = useState(false);
  const [copiedStir, setCopiedStir] = useState(false);
  const [isVerifyingSoliq, setIsVerifyingSoliq] = useState(false);
  const [soliqVerifyResult, setSoliqVerifyResult] = useState<{
    isAttached: boolean;
    message: string;
    attachedAt?: string;
  } | null>(null);

  // Step 3: Bank Card & Contact
  const [bankCardNumber, setBankCardNumber] = useState('');
  const [bankCardHolderName, setBankCardHolderName] = useState('');
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
        supportPhone: string;
      }>('/sellers/platform-config');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const platformStir = platformConfig?.platformStir || '313296455';
  const platformName = platformConfig?.platformName || '"TILAV" MCHJ (Yaqin Market)';
  const commissionRate = platformConfig?.commissionRate ?? 12;

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
      if (res.data.companyName) setCompanyName(res.data.companyName);
      if (res.data.legalName) setLegalName(res.data.legalName);
      if (res.data.legalAddress) setLegalAddress(res.data.legalAddress);
      if (!bankCardHolderName && (res.data.legalName || user?.name)) {
        setBankCardHolderName((res.data.legalName || user?.name || '').toUpperCase());
      }
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

  const formatCardInput = (text: string) => {
    const raw = text.replace(/\D/g, '').slice(0, 16);
    const groups = raw.match(/.{1,4}/g);
    return groups ? groups.join(' ') : raw;
  };

  const cardType = useMemo(() => {
    const raw = bankCardNumber.replace(/\s+/g, '');
    if (raw.startsWith('8600')) return 'UZCARD';
    if (raw.startsWith('9860')) return 'HUMO';
    if (raw.startsWith('4')) return 'VISA';
    if (raw.startsWith('5')) return 'MASTERCARD';
    return null;
  }, [bankCardNumber]);

  // Validation
  const canGoToStep2 = cleanStir.length === 9 && !!stirData && companyName.trim().length >= 2 && ofertaAccepted;
  const canGoToStep3 = soliqConfirmed;
  const rawCard = bankCardNumber.replace(/\s+/g, '');
  const canSubmit = rawCard.length === 16 && bankCardHolderName.trim().length > 3;

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
        bankCardNumber: rawCard,
        bankCardHolderName: bankCardHolderName.trim().toUpperCase(),
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
      Alert.alert(
        "Arizangiz qabul qilindi! 🎉",
        "Hamkorlik arizangiz tekshirish uchun yuborildi. Operator tasdiqlagach, ilovada bemalol yangi do'konlaringizni ochishingiz mumkin.",
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
            {step === 3 && '3/3: Karta & Shartnoma'}
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
            Savdo kartasi
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
                    <Pressable onPress={() => setShowOfertaModal(true)} hitSlop={6}>
                      <Text style={styles.ofertaLinkText}>
                        Shartnoma matnini to'liq o'qish ↗
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

          {/* ===================== STEP 3: KARTA & YAKUN ===================== */}
          {step === 3 && (
            <View style={styles.stepWrapper}>
              {/* Virtual Bank Card Mockup */}
              <View style={styles.bankCardMockup}>
                <View style={styles.bankCardTop}>
                  <View style={styles.bankChip}>
                    <View style={styles.bankChipLines} />
                  </View>
                  <View style={styles.cardTypeBadge}>
                    <Text style={styles.cardTypeText}>{cardType || 'UZCARD / HUMO'}</Text>
                  </View>
                </View>

                <Text style={styles.bankCardDigits}>
                  {bankCardNumber ? bankCardNumber : '•••• •••• •••• ••••'}
                </Text>

                <View style={styles.bankCardBottom}>
                  <View>
                    <Text style={styles.bankCardHolderLabel}>KARTA EGASI</Text>
                    <Text style={styles.bankCardHolderVal} numberOfLines={1}>
                      {bankCardHolderName ? bankCardHolderName : 'F.I.SH.'}
                    </Text>
                  </View>
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutBadgeText}>100% Avto-tushum</Text>
                  </View>
                </View>
              </View>

              {/* Card Inputs Form */}
              <View style={styles.formCard}>
                <Text style={styles.cardSectionHeading}>Hisob-kitob rekvizitlari</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Karta raqami (16 xonali Uzcard yoki Humo)</Text>
                  <View style={styles.inputWithIcon}>
                    <CreditCard size={18} color={colors.text.hint} />
                    <TextInput
                      style={styles.textInput}
                      value={bankCardNumber}
                      onChangeText={(t) => setBankCardNumber(formatCardInput(t))}
                      placeholder="8600 0000 0000 0000"
                      placeholderTextColor={colors.text.hint}
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Karta egasining to'liq ismi (F.I.SH.)</Text>
                  <View style={styles.inputWithIcon}>
                    <User size={18} color={colors.text.hint} />
                    <TextInput
                      style={styles.textInput}
                      value={bankCardHolderName}
                      onChangeText={setBankCardHolderName}
                      placeholder="MASALAN: JASUR KARIMOV"
                      placeholderTextColor={colors.text.hint}
                      autoCapitalize="characters"
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
                  <Text style={styles.receiptKey}>Savdo kartasi:</Text>
                  <Text style={styles.receiptVal}>{bankCardNumber || '—'}</Text>
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

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                {`1. UMUMIY SHARTLAR\n\n1.1. Ushbu Ommaviy Oferta ${platformName} (keyingi o'rinlarda 'Operator' yoki 'Platforma') hamda Yaqin Market orqali o'z tovar va mahsulotlarini sotish istagida bo'lgan yuridik shaxs yoki YaTT (keyingi o'rinlarda 'Hamkor') o'rtasida tuziladi.\n\n2. XIZMAT HAQI VA VOSITACHILIK\n\n2.1. Platforma xizmat haqi har bir muvaffaqiyatli yetkazilgan va qabul qilingan buyurtma summasidan ${commissionRate}% miqdorida belgilanadi.\n2.2. Savdo tushumlari Hamkor ko'rsatgan bank kartasiga (Uzcard/Humo) avtomatik ravishda o'tkazib beriladi.\n\n3. SOLIQ VA FISKAL MAJBURIYATLAR\n\n3.1. Hamkor O'zbekiston Respublikasi Soliq kodeksiga muvofiq my3.soliq.uz kabinetida '${platformStir}' (${platformName}) ni komissioner sifatida biriktirishi shart.\n3.2. Sotuvga qo'yiladigan barcha mahsulotlar qonuniy, sertifikatlangan va O'zbekiston standartlariga mos bo'lishi talab etiladi.\n\n4. DO'KONLAR VA FILIALLAR\n\n4.1. Ariza tasdiqlangach, Hamkor o'zining birinchi do'konini bepul ochadi.`}
              </Text>
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
    padding: spacing.xl,
    maxHeight: '85%',
    gap: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: colors.palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    maxHeight: 350,
  },
  modalText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  modalAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
  },
  modalAcceptText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.palette.white,
  },
});
