import { Image as ExpoImage } from 'expo-image';
import { Check, ExternalLink, FileText, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

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
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <FileText size={20} color={colors.brand.primary} />
              <Text style={styles.modalTitle}>{tr('sellerApp.ofertaModalTitle')}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <X size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.pdfHeaderRow}>
            <Text style={styles.pdfHeaderNotice}>{tr('sellerApp.ofertaModalNotice')}</Text>
            <Pressable onPress={onOpenExternalPdf} style={styles.externalLinkBtn}>
              <ExternalLink size={13} color={colors.brand.primary} />
              <Text style={styles.externalLinkText}>{tr('sellerApp.ofertaPdfBtn')}</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View style={styles.pdfPagesContainer}>
              <ExpoImage
                source={{
                  uri: resolvePdfUrl('/api/uploads/legal/oferta_page-1.png?v=20260904_2'),
                }}
                style={styles.pdfPageImage}
                contentFit="contain"
                priority="high"
              />
              <View style={styles.pdfPageBadge}>
                <Text style={styles.pdfPageBadgeText}>{tr('sellerApp.ofertaPage1')}</Text>
              </View>

              <ExpoImage
                source={{
                  uri: resolvePdfUrl('/api/uploads/legal/oferta_page-2.png?v=20260904_2'),
                }}
                style={[styles.pdfPageImage, { marginTop: 14 }]}
                contentFit="contain"
                priority="high"
              />
              <View style={styles.pdfPageBadge}>
                <Text style={styles.pdfPageBadgeText}>{tr('sellerApp.ofertaPage2')}</Text>
              </View>
            </View>
          </ScrollView>

          <Pressable onPress={onAccept} style={styles.modalAcceptBtn}>
            <Check size={18} color={colors.palette.white} />
            <Text style={styles.modalAcceptText}>{tr('sellerApp.ofertaAcceptBtn')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.palette.white,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    padding: spacing.lg,
    height: '92%',
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text.primary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.palette.gray50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.xs,
    gap: 8,
  },
  pdfHeaderNotice: {
    flex: 1,
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 15,
  },
  externalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  externalLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  modalBody: {
    flex: 1,
  },
  pdfPagesContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  pdfPageImage: {
    width: '100%',
    aspectRatio: 1654 / 2339,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  pdfPageBadge: {
    backgroundColor: colors.palette.gray100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: 6,
  },
  pdfPageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  modalAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
    marginTop: spacing.xs,
  },
  modalAcceptText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.palette.white,
  },
});
