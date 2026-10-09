import { Building2, Hash, Landmark, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, shadow, spacing } from '@/theme';

import { StirData } from './types';

interface SellerAppStep3BankProps {
  bankAccountNumber: string;
  bankMfo: string;
  bankName: string;
  bankAccountHolderName: string;
  contactPhone: string;
  companyName: string;
  stirData: StirData | null;
  cleanStir: string;
  commissionRate: number;
  onBankAccountNumberChange: (text: string) => void;
  onBankMfoChange: (text: string) => void;
  onBankNameChange: (text: string) => void;
  onBankAccountHolderNameChange: (text: string) => void;
  onContactPhoneChange: (text: string) => void;
}

export function SellerAppStep3Bank({
  bankAccountNumber,
  bankMfo,
  bankName,
  bankAccountHolderName,
  contactPhone,
  companyName,
  stirData,
  cleanStir,
  commissionRate,
  onBankAccountNumberChange,
  onBankMfoChange,
  onBankNameChange,
  onBankAccountHolderNameChange,
  onContactPhoneChange,
}: SellerAppStep3BankProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.stepWrapper}>
      {/* Virtual Bank Account Mockup */}
      <View style={styles.bankCardMockup}>
        <View style={styles.bankCardTop}>
          <View style={styles.bankChip}>
            <Landmark size={22} color="#ffffff" strokeWidth={2.2} />
          </View>
          <View style={styles.cardTypeBadge}>
            <Text style={styles.cardTypeText}>
              {bankMfo ? `MFO: ${bankMfo}` : tr('sellerApp.bankCardTitle')}
            </Text>
          </View>
        </View>

        <Text style={styles.bankCardDigits} numberOfLines={1}>
          {bankAccountNumber ? bankAccountNumber : '2020 8000 •••• •••• ••••'}
        </Text>

        <View style={styles.bankCardBottom}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.bankCardHolderLabel}>{tr('sellerApp.bankAccountHolder')}</Text>
            <Text style={styles.bankCardHolderVal} numberOfLines={1}>
              {bankAccountHolderName || companyName || 'KORXONA NOMI'}
            </Text>
          </View>
          <View style={styles.payoutBadge}>
            <Text style={styles.payoutBadgeText}>{tr('sellerApp.zeroCommission')}</Text>
          </View>
        </View>
      </View>

      {/* Bank Account Inputs Form */}
      <View style={styles.formCard}>
        <Text style={styles.cardSectionHeading}>{tr('sellerApp.bankDetailsTitle')}</Text>
        <Text style={styles.formCardSub}>{tr('sellerApp.bankDetailsDesc')}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {tr('sellerApp.bankAccountLabel')} <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <Hash size={18} color={colors.text.hint} />
            <TextInput
              style={styles.textInput}
              value={bankAccountNumber}
              onChangeText={onBankAccountNumberChange}
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
              {tr('sellerApp.bankMfoLabel')} <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputWithIcon}>
              <Building2 size={18} color={colors.text.hint} />
              <TextInput
                style={styles.textInput}
                value={bankMfo}
                onChangeText={onBankMfoChange}
                placeholder="00444"
                placeholderTextColor={colors.text.hint}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1.5 }]}>
            <Text style={styles.inputLabel}>{tr('sellerApp.bankNameLabel')}</Text>
            <TextInput
              style={styles.textInputFull}
              value={bankName}
              onChangeText={onBankNameChange}
              placeholder={tr('sellerApp.bankNamePlaceholder')}
              placeholderTextColor={colors.text.hint}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {tr('sellerApp.accountHolderInputLabel')} <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.inputWithIcon}>
            <User size={18} color={colors.text.hint} />
            <TextInput
              style={styles.textInput}
              value={bankAccountHolderName}
              onChangeText={onBankAccountHolderNameChange}
              placeholder={companyName || tr('sellerApp.accountHolderPlaceholder')}
              placeholderTextColor={colors.text.hint}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{tr('sellerApp.contactPhoneLabel')}</Text>
          <TextInput
            style={styles.textInputFull}
            value={contactPhone}
            onChangeText={onContactPhoneChange}
            placeholder="+998 90 123 45 67"
            placeholderTextColor={colors.text.hint}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Summary Receipt Card */}
      <View style={styles.receiptCard}>
        <Text style={styles.receiptTitle}>{tr('sellerApp.summaryTitle')}</Text>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptKey}>{tr('sellerApp.summaryOrg')}</Text>
          <Text style={styles.receiptVal} numberOfLines={1}>
            {companyName || stirData?.companyName || '—'}
          </Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptKey}>{tr('sellerApp.summaryStir')}</Text>
          <Text style={styles.receiptVal}>{cleanStir}</Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptKey}>{tr('sellerApp.summaryAccount')}</Text>
          <Text style={styles.receiptVal} numberOfLines={1}>
            {bankAccountNumber ? `${bankAccountNumber.slice(0, 10)}...` : '—'}
          </Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptKey}>{tr('sellerApp.summaryMfo')}</Text>
          <Text style={styles.receiptVal}>{bankMfo || '—'}</Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptKey}>{tr('sellerApp.summarySoliq')}</Text>
          <Text style={[styles.receiptVal, { color: '#16A34A' }]}>{tr('sellerApp.summaryAttached')}</Text>
        </View>

        <View style={styles.receiptRow}>
          <Text style={styles.receiptKey}>{tr('sellerApp.summaryComm')}</Text>
          <Text style={styles.receiptVal}>
            {tr('sellerApp.summaryCommRate', { rate: commissionRate })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepWrapper: {
    gap: spacing.lg,
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
  formCard: {
    backgroundColor: colors.palette.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
    ...shadow.xs,
  },
  cardSectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
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
  inputGroup: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
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
});
