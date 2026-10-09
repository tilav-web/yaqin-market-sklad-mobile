import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Brand, Radius, Spacing } from '@/constants/theme';
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
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modalCenter} pointerEvents="box-none">
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>{tr('staff.qrTitle')}</Text>
          <Text style={styles.qrSubtitle}>{invite.shopName}</Text>

          <View style={[styles.qrWrapper, isExpired && { opacity: 0.3 }]}>
            <QRCode
              value={`yaqin://staff-invite?token=${encodeURIComponent(invite.token)}`}
              size={210}
            />
          </View>

          <Text style={[styles.qrTimer, isExpired && styles.qrTimerExpired]}>
            {isExpired ? tr('staff.qrExpired') : tr('staff.qrValidFor', { minutes: minsLeft })}
          </Text>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{tr('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  qrCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: 320,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.black,
  },
  qrSubtitle: {
    fontSize: 13,
    color: Brand.gray600,
  },
  qrWrapper: {
    padding: Spacing.four,
    backgroundColor: Brand.white,
    borderRadius: Radius.md,
  },
  qrTimer: {
    fontSize: 13,
    color: Brand.gray600,
    fontWeight: '600',
  },
  qrTimerExpired: {
    color: Brand.red,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: Brand.red,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: {
    color: Brand.white,
    fontWeight: '800',
    fontSize: 15,
  },
});
