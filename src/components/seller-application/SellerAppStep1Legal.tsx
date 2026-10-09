import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Info,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, shadow, spacing } from '@/theme';

import { StirData } from './types';

interface SellerAppStep1LegalProps {
  platformName: string;
  commissionRate: number;
  stir: string;
  cleanStir: string;
  isCheckingStir: boolean;
  stirData: StirData | null;
  stirError: string | null;
  onStirChange: (text: string) => void;
  onCheckStir: () => void;
  ofertaAccepted: boolean;
  onToggleOferta: () => void;
  onOpenOfertaModal: () => void;
}

export function SellerAppStep1Legal({
  platformName,
  commissionRate,
  stir,
  cleanStir,
  isCheckingStir,
  stirData,
  stirError,
  onStirChange,
  onCheckStir,
  ofertaAccepted,
  onToggleOferta,
  onOpenOfertaModal,
}: SellerAppStep1LegalProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.stepWrapper}>
      {/* Hero Program Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconBox}>
            <Building2 size={24} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>
              {tr('sellerApp.introTitle', { name: platformName })}
            </Text>
            <Text style={styles.heroDesc}>{tr('sellerApp.introDesc')}</Text>
          </View>
        </View>
      </View>

      {/* STIR Input Card */}
      <View style={styles.formCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.inputLabel}>{tr('sellerApp.stirLabel')}</Text>
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

        {/* Real-time Dynamic Input Box */}
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
            onChangeText={onStirChange}
            placeholder="305 123 456"
            placeholderTextColor={colors.text.hint}
            keyboardType="number-pad"
            maxLength={9}
          />

          {cleanStir.length === 9 && !isCheckingStir && !stirData && (
            <Pressable
              onPress={onCheckStir}
              hitSlop={8}
              style={[
                styles.miniReloadBtn,
                !!stirError && { backgroundColor: '#EF4444' },
              ]}
            >
              <RefreshCw size={17} color={colors.palette.white} strokeWidth={2.4} />
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
                ? tr('sellerApp.stirHintLegal')
                : tr('sellerApp.stirHintIndividual')}
            </Text>
          </View>
        )}

        {/* STIR Verified Result & Confirmed Official Details */}
        {stirData && (
          <View style={styles.verifiedBox}>
            <View style={styles.verifiedHeader}>
              <ShieldCheck size={20} color="#16A34A" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.verifiedTitle}>{tr('sellerApp.stirVerified')}</Text>
                <Text style={styles.verifiedSubtitle}>
                  {tr('sellerApp.stirVerifiedDesc')}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {stirData.entityType} • {tr('sellerApp.active')}
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
                  <Text style={styles.readOnlyLabel}>{tr('sellerApp.companyNameLabel')}</Text>
                  <Text style={styles.readOnlyValueBold}>{stirData.companyName}</Text>
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
                    <Text style={styles.readOnlyLabel}>{tr('sellerApp.directorLabel')}</Text>
                    <Text style={styles.readOnlyValue}>{stirData.legalName}</Text>
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
                    <Text style={styles.readOnlyLabel}>{tr('sellerApp.legalAddressLabel')}</Text>
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
                  <Text style={styles.greenBadgeText}>{tr('sellerApp.activeStatus')}</Text>
                </View>
                <View style={styles.neutralBadge}>
                  <Text style={styles.neutralBadgeText}>
                    {stirData.vatPayer ? tr('sellerApp.vatPayer') : tr('sellerApp.notVatPayer')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Oferta Acceptance Card */}
      <View style={styles.formCard}>
        <Pressable onPress={onToggleOferta} style={styles.ofertaRow}>
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
              {tr('sellerApp.ofertaAgreement', { platformName, rate: commissionRate })}
            </Text>
            <Pressable onPress={onOpenOfertaModal} hitSlop={6}>
              <Text style={styles.ofertaLinkText}>{tr('sellerApp.readPdfContract')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  charCounterBadgeError: {
    backgroundColor: '#FEE2E2',
  },
  charCounterBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  charCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  charCounterTextError: {
    color: '#DC2626',
    fontWeight: '800',
  },
  charCounterTextSuccess: {
    color: '#15803D',
    fontWeight: '800',
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
  miniReloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
});
