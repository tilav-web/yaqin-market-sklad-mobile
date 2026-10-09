import { AlertCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { OrderComplaint } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

const COMPLAINT_REASONS = [
  { value: 'Mahsulot yetkazilmadi', labelKey: 'orderDet.complaintNotDelivered' },
  { value: 'Mahsulot sifatsiz', labelKey: 'orderDet.complaintLowQuality' },
  { value: "Noto'g'ri mahsulot keldi", labelKey: 'orderDet.complaintWrongItem' },
  { value: 'Kam yetkazildi', labelKey: 'orderDet.complaintShort' },
  { value: 'Boshqa', labelKey: 'orderDet.complaintOther' },
] as const;

interface OrderComplaintCardProps {
  complaint?: OrderComplaint | null;
  canComplain: boolean;
  onSubmitComplaint: (reason: string, description?: string) => Promise<void>;
}

export function OrderComplaintCard({
  complaint,
  canComplain,
  onSubmitComplaint,
}: OrderComplaintCardProps) {
  const { tr } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = reason !== '' && (reason !== 'Boshqa' || customReason.trim() !== '');

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const finalReason = reason === 'Boshqa' ? customReason.trim() : reason;
    setLoading(true);
    try {
      await onSubmitComplaint(finalReason, desc.trim() || undefined);
      setOpen(false);
      setReason('');
      setCustomReason('');
      setDesc('');
    } finally {
      setLoading(false);
    }
  };

  if (complaint) {
    return (
      <View style={[styles.section, styles.complaintCard]}>
        <View style={styles.complaintHeader}>
          <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>{tr('orderDet.complaintTitle')}</Text>
        </View>
        <Text style={styles.complaintReasonText}>"{complaint.reason}"</Text>
        <View
          style={[
            styles.complaintStatusBadge,
            complaint.status === 'resolved'
              ? styles.complaintStatusResolved
              : styles.complaintStatusOpen,
          ]}>
          <Text
            style={[
              styles.complaintStatusText,
              complaint.status === 'resolved'
                ? styles.complaintStatusTextResolved
                : styles.complaintStatusTextOpen,
            ]}>
            {complaint.status === 'resolved'
              ? tr('orderDet.complaintResolved')
              : tr('orderDet.complaintReviewing')}
          </Text>
        </View>
        {complaint.resolvedAt && (
          <Text style={styles.complaintMeta}>
            {tr('orderDet.complaintResolvedAt', {
              date: new Date(complaint.resolvedAt).toLocaleDateString('uz-UZ'),
            })}
          </Text>
        )}
      </View>
    );
  }

  if (!canComplain) return null;

  return (
    <View style={styles.section}>
      {!open ? (
        <Pressable style={styles.complaintOpenBtn} onPress={() => setOpen(true)}>
          <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
          <Text style={styles.complaintOpenBtnText}>{tr('orderDet.fileComplaint')}</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.sectionTitle}>{tr('orderDet.complaintReasonTitle')}</Text>
          <View style={styles.wrap}>
            {COMPLAINT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                style={[
                  styles.reasonChip,
                  reason === r.value && styles.reasonChipActive,
                ]}>
                <Text
                  style={[
                    styles.reasonChipText,
                    reason === r.value && styles.reasonChipTextActive,
                  ]}>
                  {tr(r.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
          {reason === 'Boshqa' && (
            <TextInput
              style={styles.reviewInput}
              placeholder={tr('orderDet.writeReason')}
              placeholderTextColor={colors.text.hint}
              value={customReason}
              onChangeText={setCustomReason}
            />
          )}
          <TextInput
            style={[styles.reviewInput, styles.complaintTextarea]}
            placeholder={tr('orderDet.extraNotePlaceholder')}
            placeholderTextColor={colors.text.hint}
            value={desc}
            onChangeText={setDesc}
            multiline
          />
          <View style={styles.complaintActions}>
            <Pressable
              style={styles.ghostBtn}
              onPress={() => {
                setOpen(false);
                setReason('');
                setCustomReason('');
                setDesc('');
              }}>
              <Text style={styles.ghostBtnText}>{tr('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryBtn,
                { flex: 1 },
                !canSubmit && styles.primaryBtnDisabled,
              ]}
              disabled={!canSubmit || loading}
              onPress={handleSubmit}>
              {loading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>{tr('orderDet.send')}</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.md,
  },
  sectionTitle: { ...typography.h3, fontSize: 16 },
  complaintCard: { borderColor: colors.feedback.danger, borderWidth: 1.5 },
  complaintHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  complaintReasonText: { ...typography.body, color: colors.text.secondary, fontStyle: 'italic' },
  complaintStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  complaintStatusOpen: { backgroundColor: colors.feedback.warningSurface },
  complaintStatusResolved: { backgroundColor: colors.feedback.successSurface },
  complaintStatusText: { ...typography.caption, fontWeight: '800' },
  complaintStatusTextOpen: { color: colors.feedback.warning },
  complaintStatusTextResolved: { color: colors.feedback.success },
  complaintMeta: { ...typography.caption, color: colors.text.tertiary },
  complaintOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.feedback.danger,
    backgroundColor: colors.feedback.dangerSurface,
  },
  complaintOpenBtnText: { ...typography.buttonSmall, color: colors.feedback.danger },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  reasonChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
  },
  reasonChipText: { ...typography.bodySmall, color: colors.text.secondary },
  reasonChipTextActive: { color: colors.brand.primary, fontWeight: '700' },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    backgroundColor: colors.bg.canvas,
  },
  complaintTextarea: { height: 72, textAlignVertical: 'top' },
  complaintActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  ghostBtn: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  ghostBtnText: { ...typography.button, color: colors.text.secondary },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { ...typography.button, color: colors.text.onPrimary },
});
