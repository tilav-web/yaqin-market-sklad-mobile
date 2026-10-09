import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, shadow, spacing } from '@/theme';

import { SoliqVerifyResult } from './types';

interface SellerAppStep2SoliqProps {
  platformStir: string;
  platformName: string;
  copiedStir: boolean;
  onCopyStir: () => void;
  soliqVerifyResult: SoliqVerifyResult | null;
}

export function SellerAppStep2Soliq({
  platformStir,
  platformName,
  copiedStir,
  onCopyStir,
  soliqVerifyResult,
}: SellerAppStep2SoliqProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.stepWrapper}>
      {/* Clean Concise Header */}
      <View style={styles.cleanStepHeader}>
        <View style={styles.cleanStepIconBox}>
          <ShieldCheck size={28} color={colors.brand.primary} />
        </View>
        <Text style={styles.cleanStepTitle}>{tr('sellerApp.soliqStepTitle')}</Text>
        <Text style={styles.cleanStepSubtitle}>
          {tr('sellerApp.soliqStepSubtitle')}
        </Text>
      </View>

      {/* High-Impact Operator STIR Card */}
      <View style={styles.platformStirCard}>
        <View style={styles.platformStirHeader}>
          <Sparkles size={16} color="#FDECEA" />
          <Text style={styles.platformStirTag}>{tr('sellerApp.operatorStirTag')}</Text>
        </View>

        <Text style={styles.platformStirNumber}>{platformStir}</Text>
        <Text style={styles.platformStirOrg}>{platformName}</Text>

        <Pressable
          onPress={onCopyStir}
          style={[styles.copyStirButton, copiedStir && styles.copyStirButtonSuccess]}
        >
          {copiedStir ? (
            <>
              <CheckCircle2 size={18} color={colors.palette.white} />
              <Text style={styles.copyStirBtnText}>{tr('sellerApp.stirCopied')}</Text>
            </>
          ) : (
            <>
              <Copy size={18} color={colors.palette.white} />
              <Text style={styles.copyStirBtnText}>{tr('sellerApp.copyStir')}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Soliq Ilovasida / Portalida To'ldirish Bo'yicha Aniq Qo'llanma */}
      <View style={styles.soliqGuideCard}>
        <View style={styles.soliqGuideHeader}>
          <Info size={18} color={colors.brand.primary} />
          <Text style={styles.soliqGuideTitle}>{tr('sellerApp.guideTitle')}</Text>
        </View>

        <View style={styles.soliqGuideStep}>
          <View style={styles.guideStepNumber}>
            <Text style={styles.guideStepNumberText}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideStepLabel}>{tr('sellerApp.guideStep1')}</Text>
            <Text style={styles.guideStepHighlight}>{platformStir}</Text>
          </View>
        </View>

        <View style={styles.soliqGuideStep}>
          <View style={styles.guideStepNumber}>
            <Text style={styles.guideStepNumberText}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideStepLabel}>{tr('sellerApp.guideStep2')}</Text>
            <View style={styles.guideChipsRow}>
              <View style={styles.guideChipInactive}>
                <Text style={styles.guideChipInactiveText}>ONKM</Text>
              </View>
              <View style={styles.guideChipActive}>
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.guideChipActiveText}>Marketpleys</Text>
              </View>
              <View style={styles.guideChipInactive}>
                <Text style={styles.guideChipInactiveText}>Taxi</Text>
              </View>
              <View style={styles.guideChipInactive}>
                <Text style={styles.guideChipInactiveText}>EHF</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.soliqGuideStep}>
          <View style={styles.guideStepNumber}>
            <Text style={styles.guideStepNumberText}>3</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideStepLabel}>{tr('sellerApp.guideStep3')}</Text>
          </View>
        </View>
      </View>

      {/* Direct Link to Soliq */}
      <Pressable
        onPress={() => Linking.openURL('https://my3.soliq.uz')}
        style={styles.directSoliqLinkCard}
      >
        <View style={styles.directSoliqLinkLeft}>
          <Text style={styles.directSoliqLinkTitle}>{tr('sellerApp.openSoliqSite')}</Text>
          <Text style={styles.directSoliqLinkDesc}>
            {tr('sellerApp.openSoliqDesc')}
          </Text>
        </View>
        <ExternalLink size={20} color={colors.brand.primary} />
      </Pressable>

      {/* Dynamic Status Notification */}
      {soliqVerifyResult && !soliqVerifyResult.isAttached && (
        <View style={styles.soliqFailedCard}>
          <AlertTriangle size={22} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.soliqFailedTitle}>{tr('sellerApp.attachmentNotFound')}</Text>
            <Text style={styles.soliqFailedDesc}>
              {soliqVerifyResult.message || tr('sellerApp.soliqNotFoundFallback', { stir: platformStir })}
            </Text>
          </View>
        </View>
      )}

      {soliqVerifyResult?.isAttached && (
        <View style={styles.soliqSuccessCard}>
          <CheckCircle2 size={22} color="#16A34A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.soliqSuccessTitle}>{tr('sellerApp.attachmentConfirmed')}</Text>
            <Text style={styles.soliqSuccessDesc}>{soliqVerifyResult.message}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stepWrapper: {
    gap: spacing.lg,
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
  soliqGuideCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: spacing.md,
    ...shadow.xs,
  },
  soliqGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  soliqGuideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
  },
  soliqGuideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guideStepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  guideStepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.primary,
  },
  guideStepLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  guideStepHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.primary,
    letterSpacing: 1,
    marginTop: 2,
  },
  guideChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  guideChipInactive: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  guideChipInactiveText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  guideChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: '#16A34A',
  },
  guideChipActiveText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '800',
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
});
