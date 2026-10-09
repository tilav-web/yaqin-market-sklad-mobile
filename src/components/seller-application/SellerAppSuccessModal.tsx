import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, shadow, spacing } from '@/theme';

interface SellerAppSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SellerAppSuccessModal({ visible, onClose }: SellerAppSuccessModalProps) {
  const { tr } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.successModalBackdrop}>
        <View style={styles.successModalCard}>
          <View style={styles.successIconCircle}>
            <CheckCircle2 size={42} color="#16A34A" strokeWidth={2.4} />
          </View>

          <Text style={styles.successModalTitle}>{tr('sellerApp.successModalTitle')}</Text>
          <Text style={styles.successModalSubtitle}>{tr('sellerApp.successModalDesc')}</Text>

          <Pressable style={styles.successModalBtn} onPress={onClose}>
            <Text style={styles.successModalBtnText}>{tr('sellerApp.successModalBtn')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.palette.white,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.md,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  successModalSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  successModalBtn: {
    width: '100%',
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  successModalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.palette.white,
  },
});
