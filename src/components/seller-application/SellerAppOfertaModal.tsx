import { Image as ExpoImage } from 'expo-image';
import { Check, ExternalLink, FileText, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface SellerAppOfertaModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  onOpenExternalPdf: () => void;
  resolvePdfUrl: (url?: string) => string;
}

export function SellerAppOfertaModal({
  visible,
  onClose,
  onAccept,
  onOpenExternalPdf,
  resolvePdfUrl,
}: SellerAppOfertaModalProps) {
  const { tr } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/55 justify-end">
        <View className="bg-bg-surface rounded-t-3xl p-5 h-[92%] gap-2">
          <View className="flex-row justify-between items-center pb-1">
            <View className="flex-row items-center gap-2">
              <FileText size={20} color={colors.brand.primary} />
              <Text className="text-base font-extrabold text-text-primary">{tr('sellerApp.ofertaModalTitle')}</Text>
            </View>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center">
              <X size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between py-1.5 px-2.5 bg-bg-surface-muted rounded-xl border border-border-default mb-1 gap-2">
            <Text className="flex-1 text-[11px] text-text-secondary leading-4">{tr('sellerApp.ofertaModalNotice')}</Text>
            <Pressable onPress={onOpenExternalPdf} className="flex-row items-center gap-1 bg-brand-primary/10 px-2 py-1 rounded-md">
              <ExternalLink size={13} color={colors.brand.primary} />
              <Text className="text-[11px] font-bold text-brand-primary">{tr('sellerApp.ofertaPdfBtn')}</Text>
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View className="items-center py-1">
              <ExpoImage
                source={{
                  uri: resolvePdfUrl('/api/uploads/legal/oferta_page-1.png?v=20260904_2'),
                }}
                className="w-full rounded-xl border border-border-default bg-bg-surface"
                style={{ aspectRatio: 1654 / 2339 }}
                contentFit="contain"
                priority="high"
              />
              <View className="bg-bg-surface-muted px-3 py-1 rounded-full self-center mt-1.5">
                <Text className="text-[11px] font-bold text-text-secondary">{tr('sellerApp.ofertaPage1')}</Text>
              </View>

              <ExpoImage
                source={{
                  uri: resolvePdfUrl('/api/uploads/legal/oferta_page-2.png?v=20260904_2'),
                }}
                className="w-full rounded-xl border border-border-default bg-bg-surface mt-3.5"
                style={{ aspectRatio: 1654 / 2339 }}
                contentFit="contain"
                priority="high"
              />
              <View className="bg-bg-surface-muted px-3 py-1 rounded-full self-center mt-1.5">
                <Text className="text-[11px] font-bold text-text-secondary">{tr('sellerApp.ofertaPage2')}</Text>
              </View>
            </View>
          </ScrollView>

          <Pressable
            onPress={onAccept}
            className="flex-row items-center justify-center gap-2 bg-brand-primary py-3.5 rounded-2xl mt-1 active:opacity-85"
          >
            <Check size={18} color={colors.text.onPrimary} />
            <Text className="text-sm font-extrabold text-text-on-primary">{tr('sellerApp.ofertaAcceptBtn')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
