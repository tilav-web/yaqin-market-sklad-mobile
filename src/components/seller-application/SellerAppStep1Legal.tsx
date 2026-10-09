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
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

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
    <View className="gap-4">
      {/* Hero Program Card */}
      <View className="bg-bg-surface rounded-2xl p-4 border border-brand-primary/20 shadow-sm">
        <View className="flex-row items-start gap-3">
          <View className="w-11 h-11 rounded-xl bg-brand-primary/10 items-center justify-center">
            <Building2 size={24} color={colors.brand.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-text-primary mb-1">
              {tr('sellerApp.introTitle', { name: platformName })}
            </Text>
            <Text className="text-xs text-text-secondary leading-5">{tr('sellerApp.introDesc')}</Text>
          </View>
        </View>
      </View>

      {/* STIR Input Card */}
      <View className="bg-bg-surface rounded-2xl p-4 border border-border-subtle gap-3 shadow-sm">
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider">{tr('sellerApp.stirLabel')}</Text>
          <View
            className={`px-2 py-0.5 rounded-full border ${
              stirError
                ? 'bg-feedback-danger/10 border-feedback-danger'
                : stirData
                  ? 'bg-feedback-success/10 border-feedback-success'
                  : 'bg-bg-surface-muted border-border-default'
            }`}
          >
            <Text
              className={`text-[11px] font-bold ${
                stirError
                  ? 'text-feedback-danger'
                  : stirData
                    ? 'text-feedback-success'
                    : 'text-text-hint'
              }`}
            >
              {cleanStir.length} / 9
            </Text>
          </View>
        </View>

        {/* Real-time Dynamic Input Box */}
        <View
          className={`flex-row items-center gap-2 bg-bg-canvas rounded-2xl px-3.5 py-2.5 border ${
            stirError
              ? 'border-feedback-danger bg-feedback-danger/5'
              : stirData
                ? 'border-feedback-success bg-feedback-success/5'
                : 'border-border-default'
          }`}
        >
          {isCheckingStir ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : stirData ? (
            <CheckCircle2 size={20} color={colors.feedback.success} strokeWidth={2.4} />
          ) : stirError ? (
            <AlertTriangle size={20} color={colors.feedback.danger} strokeWidth={2.4} />
          ) : (
            <Search size={18} color={colors.text.hint} strokeWidth={2.2} />
          )}

          <TextInput
            className="flex-1 text-lg font-bold tracking-widest text-text-primary"
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
              className={`w-8 h-8 rounded-full items-center justify-center ${
                stirError ? 'bg-feedback-danger' : 'bg-brand-primary'
              }`}
            >
              <RefreshCw size={17} color={colors.text.onPrimary} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>

        {/* Real-time Error Row */}
        {!!stirError && (
          <View className="flex-row items-center gap-1.5">
            <AlertCircle size={15} color={colors.feedback.danger} />
            <Text className="text-xs text-feedback-danger font-medium flex-1">{stirError}</Text>
          </View>
        )}

        {/* Real-time Typing Hint */}
        {cleanStir.length > 0 && cleanStir.length < 9 && !stirError && (
          <View className="flex-row items-center gap-1.5">
            <Info size={14} color={colors.text.hint} />
            <Text className="text-xs text-text-hint flex-1">
              {cleanStir.startsWith('2') || cleanStir.startsWith('3')
                ? tr('sellerApp.stirHintLegal')
                : tr('sellerApp.stirHintIndividual')}
            </Text>
          </View>
        )}

        {/* STIR Verified Result & Confirmed Official Details */}
        {stirData && (
          <View className="bg-feedback-success/5 rounded-2xl p-3.5 border border-feedback-success/20 gap-3">
            <View className="flex-row items-center gap-2">
              <ShieldCheck size={20} color={colors.feedback.success} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-feedback-success">{tr('sellerApp.stirVerified')}</Text>
                <Text className="text-xs text-text-secondary">{tr('sellerApp.stirVerifiedDesc')}</Text>
              </View>
              <View className="bg-feedback-success/15 px-2 py-0.5 rounded-full">
                <Text className="text-[11px] font-bold text-feedback-success">
                  {stirData.entityType} • {tr('sellerApp.active')}
                </Text>
              </View>
            </View>

            <View className="gap-2 pt-2 border-t border-feedback-success/15">
              {/* Tashkilot Nomi */}
              <View className="flex-row items-start gap-2.5">
                <Building2 size={16} color={colors.brand.primary} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="text-[11px] text-text-tertiary font-semibold">{tr('sellerApp.companyNameLabel')}</Text>
                  <Text className="text-sm font-bold text-text-primary mt-0.5">{stirData.companyName}</Text>
                </View>
              </View>

              {/* Rahbar F.I.SH */}
              {!!stirData.legalName && (
                <View className="flex-row items-start gap-2.5">
                  <User size={16} color={colors.text.secondary} className="mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-[11px] text-text-tertiary font-semibold">{tr('sellerApp.directorLabel')}</Text>
                    <Text className="text-xs text-text-primary mt-0.5">{stirData.legalName}</Text>
                  </View>
                </View>
              )}

              {/* Yuridik Manzil */}
              {!!(stirData.legalAddress || stirData.region) && (
                <View className="flex-row items-start gap-2.5">
                  <MapPin size={16} color={colors.text.secondary} className="mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-[11px] text-text-tertiary font-semibold">{tr('sellerApp.legalAddressLabel')}</Text>
                    <Text className="text-xs text-text-primary mt-0.5">
                      {stirData.legalAddress || stirData.region}
                    </Text>
                  </View>
                </View>
              )}

              {/* Holat va QQS belgilari */}
              <View className="flex-row gap-2 mt-1">
                <View className="flex-row items-center gap-1 bg-feedback-success/10 px-2 py-1 rounded-md">
                  <CheckCircle2 size={13} color={colors.feedback.success} />
                  <Text className="text-[11px] font-bold text-feedback-success">{tr('sellerApp.activeStatus')}</Text>
                </View>
                <View className="bg-bg-surface-muted px-2 py-1 rounded-md">
                  <Text className="text-[11px] font-semibold text-text-secondary">
                    {stirData.vatPayer ? tr('sellerApp.vatPayer') : tr('sellerApp.notVatPayer')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Oferta Acceptance Card */}
      <View className="bg-bg-surface rounded-2xl p-4 border border-border-subtle shadow-sm">
        <Pressable onPress={onToggleOferta} className="flex-row items-start gap-3">
          <View
            className={`w-6 h-6 rounded-lg border-2 items-center justify-center mt-0.5 ${
              ofertaAccepted
                ? 'bg-brand-primary border-brand-primary'
                : 'border-border-default bg-bg-canvas'
            }`}
          >
            {ofertaAccepted && (
              <Check size={15} color={colors.text.onPrimary} strokeWidth={3} />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-xs text-text-primary leading-5">
              {tr('sellerApp.ofertaAgreement', { platformName, rate: commissionRate })}
            </Text>
            <Pressable onPress={onOpenOfertaModal} hitSlop={6}>
              <Text className="text-xs font-bold text-brand-primary mt-1">{tr('sellerApp.readPdfContract')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
