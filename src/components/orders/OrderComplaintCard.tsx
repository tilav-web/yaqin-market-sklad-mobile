import { AlertCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { OrderComplaint } from '@/lib/types';
import { colors, typography } from '@/theme';

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
      <View
        className="p-4 rounded-2xl border-[1.5px] gap-3"
        style={{
          backgroundColor: colors.bg.surface,
          borderColor: colors.feedback.danger,
        }}>
        <View className="flex-row items-center gap-1.5">
          <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
          <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
            {tr('orderDet.complaintTitle')}
          </Text>
        </View>
        <Text className="italic" style={[typography.body, { color: colors.text.secondary }]}>
          "{complaint.reason}"
        </Text>
        <View
          className="self-start px-3 py-1 rounded-full"
          style={{
            backgroundColor: complaint.status === 'resolved'
              ? colors.feedback.successSurface
              : colors.feedback.warningSurface,
          }}>
          <Text
            className="font-extrabold"
            style={[
              typography.caption,
              {
                color: complaint.status === 'resolved'
                  ? colors.feedback.success
                  : colors.feedback.warning,
              },
            ]}>
            {complaint.status === 'resolved'
              ? tr('orderDet.complaintResolved')
              : tr('orderDet.complaintReviewing')}
          </Text>
        </View>
        {complaint.resolvedAt && (
          <Text style={[typography.caption, { color: colors.text.tertiary }]}>
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
    <View
      className="p-4 rounded-2xl border gap-3"
      style={{
        backgroundColor: colors.bg.surface,
        borderColor: colors.border.subtle,
      }}>
      {!open ? (
        <Pressable
          className="flex-row items-center justify-center gap-2 h-12 rounded-xl border-[1.5px]"
          style={{
            borderColor: colors.feedback.danger,
            backgroundColor: colors.feedback.dangerSurface,
          }}
          onPress={() => setOpen(true)}>
          <AlertCircle size={16} color={colors.feedback.danger} strokeWidth={2.2} />
          <Text style={[typography.buttonSmall, { color: colors.feedback.danger }]}>
            {tr('orderDet.fileComplaint')}
          </Text>
        </Pressable>
      ) : (
        <>
          <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
            {tr('orderDet.complaintReasonTitle')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {COMPLAINT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                className="px-3 py-2 rounded-full border"
                style={{
                  borderColor: reason === r.value ? colors.brand.primary : colors.border.default,
                  backgroundColor: reason === r.value ? colors.brand.primarySurface : colors.bg.surface,
                }}>
                <Text
                  style={[
                    typography.bodySmall,
                    {
                      color: reason === r.value ? colors.brand.primary : colors.text.secondary,
                      fontWeight: reason === r.value ? '700' : '400',
                    },
                  ]}>
                  {tr(r.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
          {reason === 'Boshqa' && (
            <TextInput
              className="border rounded-xl p-3"
              style={[
                typography.body,
                {
                  borderColor: colors.border.default,
                  backgroundColor: colors.bg.canvas,
                },
              ]}
              placeholder={tr('orderDet.writeReason')}
              placeholderTextColor={colors.text.hint}
              value={customReason}
              onChangeText={setCustomReason}
            />
          )}
          <TextInput
            className="border rounded-xl p-3 h-18"
            style={[
              typography.body,
              {
                borderColor: colors.border.default,
                backgroundColor: colors.bg.canvas,
                textAlignVertical: 'top',
              },
            ]}
            placeholder={tr('orderDet.extraNotePlaceholder')}
            placeholderTextColor={colors.text.hint}
            value={desc}
            onChangeText={setDesc}
            multiline
          />
          <View className="flex-row gap-2 mt-1">
            <Pressable
              className="h-12 px-4 rounded-xl items-center justify-center border"
              style={{ borderColor: colors.border.default }}
              onPress={() => {
                setOpen(false);
                setReason('');
                setCustomReason('');
                setDesc('');
              }}>
              <Text style={[typography.button, { color: colors.text.secondary }]}>
                {tr('common.cancel')}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 h-12 rounded-xl items-center justify-center"
              style={{
                backgroundColor: colors.brand.primary,
                opacity: !canSubmit ? 0.5 : 1,
              }}
              disabled={!canSubmit || loading}
              onPress={handleSubmit}>
              {loading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={[typography.button, { color: colors.text.onPrimary }]}>
                  {tr('orderDet.send')}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
