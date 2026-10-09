import * as WebBrowser from 'expo-web-browser';
import { Receipt, Share2, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FiscalReceiptDetails } from '@/components/fiscal/FiscalReceiptDetails';
import { useTranslation } from '@/i18n';
import { FiscalReceipt } from '@/lib/types';
import { colors } from '@/theme';

interface FiscalReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  receipt: FiscalReceipt | null;
  loading?: boolean;
}

export function FiscalReceiptModal({
  visible,
  onClose,
  receipt,
  loading = false,
}: FiscalReceiptModalProps) {
  const { tr } = useTranslation();

  const handleOpenSoliq = async () => {
    if (!receipt?.qrUrl) return;
    try {
      await WebBrowser.openBrowserAsync(receipt.qrUrl, { showTitle: true });
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (!receipt) return;
    try {
      const text = [
        `🧾 ${receipt.type === 'refund' ? tr('fiscal.refundReceipt') : tr('fiscal.saleReceipt')}`,
        `Do'kon: ${receipt.sellerName || 'Yaqin Market'}`,
        `STIR: ${receipt.sellerStir || '—'}`,
        `Jami: ${receipt.totalAmount.toLocaleString()} so'm`,
        `Fiskal belgi: ${receipt.fiscalSign || '—'}`,
        `Chek havolasi: ${receipt.qrUrl || '—'}`,
      ].join('\n');
      await Share.share({ message: text });
    } catch {
      // ignore
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="justify-end" pointerEvents="box-none">
        <View className="bg-surface rounded-t-3xl max-h-[90%] min-h-[60%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
            <View className="flex-row items-center gap-2">
              <Receipt size={20} color={colors.brand.primary} strokeWidth={2.4} />
              <Text className="text-xl font-bold text-text-primary">{tr('fiscal.title')}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {receipt && (
                <Pressable className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center" onPress={handleShare}>
                  <Share2 size={18} color={colors.text.primary} strokeWidth={2.2} />
                </Pressable>
              )}
              <Pressable className="w-8 h-8 rounded-full bg-surface-muted items-center justify-center" onPress={onClose}>
                <X size={20} color={colors.text.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center p-8 gap-3">
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text className="text-sm text-text-secondary">{tr('fiscal.loading')}</Text>
            </View>
          ) : !receipt ? (
            <View className="flex-1 items-center justify-center p-8">
              <Text className="text-base text-text-hint">{tr('fiscal.notAvailable')}</Text>
            </View>
          ) : (
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <FiscalReceiptDetails receipt={receipt} onOpenSoliq={handleOpenSoliq} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
