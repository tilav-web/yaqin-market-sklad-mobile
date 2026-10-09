import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTranslation } from '@/i18n';

import { InviteResp } from './types';

interface InviteQrModalProps {
  invite: InviteResp | null;
  nowTick: number;
  onClose: () => void;
}

export function InviteQrModal({ invite, nowTick, onClose }: InviteQrModalProps) {
  const { tr } = useTranslation();
  if (!invite) return null;

  const msLeft = new Date(invite.expiresAt).getTime() - nowTick;
  const minsLeft = Math.max(0, Math.ceil(msLeft / 60_000));
  const isExpired = msLeft <= 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="absolute inset-0 bg-black/55" onPress={onClose} />
      <View className="flex-1 items-center justify-center p-4" pointerEvents="box-none">
        <View className="bg-bg-surface rounded-3xl p-5 items-center gap-3 w-full max-w-[320px]">
          <Text className="text-lg font-extrabold text-text-primary">{tr('staff.qrTitle')}</Text>
          <Text className="text-xs text-text-secondary">{invite.shopName}</Text>

          <View className={`p-4 bg-bg-surface rounded-xl ${isExpired ? 'opacity-30' : ''}`}>
            <QRCode
              value={`yaqin://staff-invite?token=${encodeURIComponent(invite.token)}`}
              size={210}
            />
          </View>

          <Text className={`text-xs ${isExpired ? 'text-feedback-danger font-bold' : 'text-text-secondary font-semibold'}`}>
            {isExpired ? tr('staff.qrExpired') : tr('staff.qrValidFor', { minutes: minsLeft })}
          </Text>

          <Pressable className="bg-brand-primary rounded-2xl py-3 w-full items-center active:opacity-85" onPress={onClose}>
            <Text className="text-text-on-primary font-bold text-sm">{tr('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
