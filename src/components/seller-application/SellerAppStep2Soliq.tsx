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
import { Linking, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

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
    <View className="gap-4">
      {/* Clean Concise Header */}
      <View className="items-center py-3 gap-2">
        <View className="w-14 h-14 rounded-full bg-brand-primary/10 items-center justify-center mb-1">
          <ShieldCheck size={28} color={colors.brand.primary} />
        </View>
        <Text className="text-xl font-extrabold text-text-primary text-center">
          {tr('sellerApp.soliqStepTitle')}
        </Text>
        <Text className="text-sm text-text-secondary text-center leading-5 px-4">
          {tr('sellerApp.soliqStepSubtitle')}
        </Text>
      </View>

      {/* High-Impact Operator STIR Card */}
      <View className="bg-zinc-900 rounded-3xl p-6 items-center gap-1 shadow-md">
        <View className="flex-row items-center gap-1.5 mb-0.5">
          <Sparkles size={16} color={colors.brand.primary} />
          <Text className="text-[11px] font-extrabold text-brand-primary tracking-widest">
            {tr('sellerApp.operatorStirTag')}
          </Text>
        </View>

        <Text className="text-4xl font-black text-white tracking-widest my-1">
          {platformStir}
        </Text>
        <Text className="text-sm font-bold text-zinc-300">{platformName}</Text>

        <Pressable
          onPress={onCopyStir}
          className={`flex-row items-center justify-center gap-2 px-6 py-3 rounded-2xl mt-4 active:opacity-85 ${
            copiedStir ? 'bg-feedback-success' : 'bg-brand-primary'
          }`}
        >
          {copiedStir ? (
            <>
              <CheckCircle2 size={18} color={colors.text.onPrimary} />
              <Text className="text-sm font-extrabold text-white">{tr('sellerApp.stirCopied')}</Text>
            </>
          ) : (
            <>
              <Copy size={18} color={colors.text.onPrimary} />
              <Text className="text-sm font-extrabold text-white">{tr('sellerApp.copyStir')}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Soliq Ilovasida / Portalida To'ldirish Bo'yicha Aniq Qo'llanma */}
      <View className="bg-bg-surface rounded-3xl p-5 border border-border-subtle gap-3.5 shadow-sm">
        <View className="flex-row items-center gap-2">
          <Info size={18} color={colors.brand.primary} />
          <Text className="text-sm font-extrabold text-text-primary">{tr('sellerApp.guideTitle')}</Text>
        </View>

        <View className="flex-row items-start gap-3">
          <View className="w-6 h-6 rounded-full bg-brand-primary/10 items-center justify-center mt-0.5">
            <Text className="text-xs font-black text-brand-primary">1</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-text-secondary leading-4">{tr('sellerApp.guideStep1')}</Text>
            <Text className="text-sm font-extrabold text-brand-primary mt-0.5">{platformStir}</Text>
          </View>
        </View>

        <View className="flex-row items-start gap-3">
          <View className="w-6 h-6 rounded-full bg-brand-primary/10 items-center justify-center mt-0.5">
            <Text className="text-xs font-black text-brand-primary">2</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-text-secondary leading-4">{tr('sellerApp.guideStep2')}</Text>
            <View className="flex-row flex-wrap gap-1.5 mt-1.5">
              <View className="px-2 py-0.5 rounded-md bg-bg-surface-muted border border-border-default">
                <Text className="text-[11px] text-text-tertiary font-semibold">ONKM</Text>
              </View>
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-md bg-feedback-success">
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
                <Text className="text-[11px] text-white font-extrabold">Marketpleys</Text>
              </View>
              <View className="px-2 py-0.5 rounded-md bg-bg-surface-muted border border-border-default">
                <Text className="text-[11px] text-text-tertiary font-semibold">Taxi</Text>
              </View>
              <View className="px-2 py-0.5 rounded-md bg-bg-surface-muted border border-border-default">
                <Text className="text-[11px] text-text-tertiary font-semibold">EHF</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="flex-row items-start gap-3">
          <View className="w-6 h-6 rounded-full bg-brand-primary/10 items-center justify-center mt-0.5">
            <Text className="text-xs font-black text-brand-primary">3</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-text-secondary leading-4">{tr('sellerApp.guideStep3')}</Text>
          </View>
        </View>
      </View>

      {/* Direct Link to Soliq Site */}
      <Pressable
        onPress={() => Linking.openURL('https://my3.soliq.uz')}
        className="flex-row items-center justify-between bg-bg-surface rounded-2xl p-4 border border-brand-primary/20 shadow-sm active:opacity-75"
      >
        <View className="flex-1 pr-3">
          <Text className="text-sm font-extrabold text-text-primary">{tr('sellerApp.openSoliqSite')}</Text>
          <Text className="text-xs text-text-secondary mt-0.5 leading-4">
            {tr('sellerApp.openSoliqDesc')}
          </Text>
        </View>
        <ExternalLink size={20} color={colors.brand.primary} />
      </Pressable>

      {/* Dynamic Status Notification */}
      {soliqVerifyResult && !soliqVerifyResult.isAttached && (
        <View className="flex-row items-start gap-3 bg-feedback-danger/5 rounded-2xl p-4 border border-feedback-danger/20">
          <AlertTriangle size={22} color={colors.feedback.danger} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-feedback-danger">{tr('sellerApp.attachmentNotFound')}</Text>
            <Text className="text-xs text-feedback-danger/90 leading-4 mt-0.5">
              {soliqVerifyResult.message || tr('sellerApp.soliqNotFoundFallback', { stir: platformStir })}
            </Text>
          </View>
        </View>
      )}

      {soliqVerifyResult?.isAttached && (
        <View className="flex-row items-start gap-3 bg-feedback-success/5 rounded-2xl p-4 border border-feedback-success/20">
          <CheckCircle2 size={22} color={colors.feedback.success} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-feedback-success">{tr('sellerApp.attachmentConfirmed')}</Text>
            <Text className="text-xs text-feedback-success/90 leading-4 mt-0.5">{soliqVerifyResult.message}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
