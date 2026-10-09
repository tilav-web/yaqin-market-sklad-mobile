import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface SellerAppSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SellerAppSuccessModal({ visible, onClose }: SellerAppSuccessModalProps) {
  const { tr } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-6">
        <View className="w-full max-w-[380px] bg-bg-surface rounded-3xl p-6 items-center shadow-md">
          <View className="w-[76px] h-[76px] rounded-full bg-feedback-success/15 items-center justify-center mb-4">
            <CheckCircle2 size={42} color={colors.feedback.success} strokeWidth={2.4} />
          </View>

          <Text className="text-lg font-extrabold text-text-primary text-center mb-1">
            {tr('sellerApp.successModalTitle')}
          </Text>
          <Text className="text-xs text-text-secondary text-center leading-5 mb-6">
            {tr('sellerApp.successModalDesc')}
          </Text>

          <Pressable
            className="w-full bg-brand-primary py-3.5 rounded-2xl items-center active:opacity-85"
            onPress={onClose}
          >
            <Text className="text-sm font-extrabold text-text-on-primary">
              {tr('sellerApp.successModalBtn')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
