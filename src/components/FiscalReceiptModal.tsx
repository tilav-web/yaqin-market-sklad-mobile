import * as WebBrowser from 'expo-web-browser';
import { CheckCircle2, ExternalLink, QrCode as QrIcon, Receipt, Share2, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTranslation } from '@/i18n';
import { FiscalReceipt } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

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
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Receipt size={20} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={styles.headerTitle}>{tr('fiscal.title')}</Text>
            </View>
            <View style={styles.headerActions}>
              {receipt && (
                <Pressable style={styles.iconBtn} onPress={handleShare}>
                  <Share2 size={18} color={colors.text.primary} strokeWidth={2.2} />
                </Pressable>
              )}
              <Pressable style={styles.iconBtn} onPress={onClose}>
                <X size={20} color={colors.text.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text style={styles.loadingText}>{tr('fiscal.loading')}</Text>
            </View>
          ) : !receipt ? (
            <View style={styles.loadingBox}>
              <Text style={styles.emptyText}>{tr('fiscal.notAvailable')}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Receipt Paper Card */}
              <View style={styles.paperCard}>
                {/* Type Badge */}
                <View style={styles.typeBadgeRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      receipt.type === 'refund' ? styles.typeBadgeRefund : styles.typeBadgeSale,
                    ]}>
                    <CheckCircle2
                      size={12}
                      color={receipt.type === 'refund' ? '#DC2626' : '#16A34A'}
                      strokeWidth={2.8}
                    />
                    <Text
                      style={[
                        styles.typeBadgeText,
                        receipt.type === 'refund' ? styles.typeBadgeTextRefund : styles.typeBadgeTextSale,
                      ]}>
                      {receipt.type === 'refund' ? tr('fiscal.refundReceipt') : tr('fiscal.saleReceipt')}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(receipt.createdAt).toLocaleString('uz-UZ', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Seller & Platform Information */}
                <View style={styles.partiesBlock}>
                  <View style={styles.partyRow}>
                    <Text style={styles.partyLabel}>{tr('fiscal.seller')}:</Text>
                    <Text style={styles.partyValue} numberOfLines={1}>
                      {receipt.sellerName || 'Do\'kon'}
                    </Text>
                  </View>
                  <View style={styles.partyRow}>
                    <Text style={styles.partyLabel}>{tr('fiscal.stir')}:</Text>
                    <Text style={styles.partyValueMonospace}>{receipt.sellerStir || '—'}</Text>
                  </View>

                  <View style={styles.dividerDashed} />

                  <View style={styles.partyRow}>
                    <Text style={styles.partyLabel}>{tr('fiscal.operator')}:</Text>
                    <Text style={styles.partyValue} numberOfLines={1}>
                      {receipt.platformLegalName || 'Yaqin Market'}
                    </Text>
                  </View>
                  <View style={styles.partyRow}>
                    <Text style={styles.partyLabel}>{tr('fiscal.stir')}:</Text>
                    <Text style={styles.partyValueMonospace}>{receipt.platformStir || '—'}</Text>
                  </View>
                </View>

                {/* Items Table */}
                <View style={styles.tableBlock}>
                  <Text style={styles.tableTitle}>Tovarlar ro'yxati</Text>
                  {receipt.lines.map((l, idx) => (
                    <View key={idx} style={styles.lineRow}>
                      <View style={styles.lineInfo}>
                        <Text style={styles.lineName}>{l.productName}</Text>
                        {l.mxikCode && (
                          <Text style={styles.lineMxik}>
                            {tr('fiscal.mxik')}: {l.mxikCode}
                          </Text>
                        )}
                        <Text style={styles.lineCalc}>
                          {l.quantity} × {l.unitPrice.toLocaleString()} so'm
                          {l.vatRate > 0 ? ` (QQS ${l.vatRate}%: ${l.vatAmount.toLocaleString()} so'm)` : ''}
                        </Text>
                      </View>
                      <Text style={styles.lineTotal}>{l.lineTotal.toLocaleString()} so'm</Text>
                    </View>
                  ))}
                </View>

                {/* Summary Box */}
                <View style={styles.summaryBlock}>
                  {receipt.totalVatAmount > 0 && (
                    <View style={styles.sumRow}>
                      <Text style={styles.sumLabel}>Jami QQS (12%):</Text>
                      <Text style={styles.sumVal}>{receipt.totalVatAmount.toLocaleString()} so'm</Text>
                    </View>
                  )}
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>{tr('fiscal.paymentType')}:</Text>
                    <Text style={styles.sumVal}>
                      {receipt.cardAmount > 0 ? tr('fiscal.card') : tr('fiscal.cash')}
                    </Text>
                  </View>
                  <View style={styles.dividerSolid} />
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>JAMI TO'LOV:</Text>
                    <Text style={styles.totalVal}>{receipt.totalAmount.toLocaleString()} so'm</Text>
                  </View>
                </View>

                {/* QR Code & Soliq Cashback Section */}
                {receipt.qrUrl && (
                  <View style={styles.qrSection}>
                    <View style={styles.qrWrap}>
                      <QRCode value={receipt.qrUrl} size={150} />
                    </View>

                    <Pressable style={styles.soliqCashbackBtn} onPress={handleOpenSoliq}>
                      <QrIcon size={18} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.soliqCashbackBtnText}>{tr('fiscal.cashbackBanner')}</Text>
                      <ExternalLink size={16} color="#FFFFFF" strokeWidth={2.4} />
                    </Pressable>

                    <Text style={styles.qrHint}>{tr('fiscal.cashbackHint')}</Text>
                  </View>
                )}

                {/* Fiscal Metadata Footer */}
                <View style={styles.fiscalMeta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>{tr('fiscal.fiscalSign')}:</Text>
                    <Text style={styles.metaVal}>{receipt.fiscalSign || '—'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>{tr('fiscal.receiptNumber')}:</Text>
                    <Text style={styles.metaVal}>{receipt.fiscalReceiptNumber || '—'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaKey}>{tr('fiscal.terminalId')}:</Text>
                    <Text style={styles.metaVal}>{receipt.terminalId || '—'}</Text>
                  </View>
                  <Text style={styles.legalNotice}>
                    O'zbekiston Respublikasi Soliq Qo'mitasi talablariga muvofiq shakllantirilgan elektron fiskal chek.
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    minHeight: '60%',
    ...shadow.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.hint,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  paperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.sm,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  typeBadgeSale: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeRefund: {
    backgroundColor: '#FEE2E2',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadgeTextSale: {
    color: '#15803D',
  },
  typeBadgeTextRefund: {
    color: '#B91C1C',
  },
  dateText: {
    ...typography.caption,
    color: colors.text.hint,
  },
  partiesBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  partyLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  partyValue: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  partyValueMonospace: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  dividerDashed: {
    height: 1,
    borderWidth: 0.8,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: spacing.xs,
  },
  dividerSolid: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: spacing.xs,
  },
  tableBlock: {
    marginBottom: spacing.md,
  },
  tableTitle: {
    ...typography.subtitle,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  lineInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  lineName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  lineMxik: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
  },
  lineCalc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
  lineTotal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summaryBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  sumLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  sumVal: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalLabel: {
    ...typography.subtitle,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  totalVal: {
    ...typography.h3,
    color: colors.brand.primary,
    fontWeight: '800',
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  qrWrap: {
    padding: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  soliqCashbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#0284C7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  soliqCashbackBtnText: {
    ...typography.subtitle,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  qrHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  fiscalMeta: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  metaKey: {
    ...typography.caption,
    color: colors.text.hint,
    fontSize: 10,
  },
  metaVal: {
    ...typography.caption,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
  },
  legalNotice: {
    ...typography.caption,
    color: colors.text.hint,
    fontSize: 9,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
