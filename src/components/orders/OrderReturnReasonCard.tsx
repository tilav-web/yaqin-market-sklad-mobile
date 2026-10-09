import { RotateCcw } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

interface OrderReturnReasonCardProps {
  returnReason?: string | null;
  onSubmitReason: (reason: string) => Promise<void>;
}

export function OrderReturnReasonCard({
  returnReason,
  onSubmitReason,
}: OrderReturnReasonCardProps) {
  const { tr } = useTranslation();
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!draft.trim()) return;
    setLoading(true);
    try {
      await onSubmitReason(draft.trim());
      setDraft('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.returnHeader}>
        <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
        <Text style={styles.sectionTitle}>{tr('orderDet.returnedTitle')}</Text>
      </View>
      {returnReason ? (
        <Text style={styles.reasonSaved}>"{returnReason}"</Text>
      ) : (
        <>
          <Text style={styles.reasonHint}>{tr('orderDet.returnReasonHint')}</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder={tr('orderDet.returnReasonPlaceholder')}
            placeholderTextColor={colors.text.hint}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          {draft.trim().length > 0 && (
            <Pressable
              style={styles.primaryBtn}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>{tr('orderDet.saveReason')}</Text>
              )}
            </Pressable>
          )}
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
  returnHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { ...typography.h3, fontSize: 16 },
  reasonSaved: { ...typography.body, color: colors.text.secondary, fontStyle: 'italic' },
  reasonHint: { ...typography.bodySmall, color: colors.text.secondary },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    backgroundColor: colors.bg.canvas,
  },
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { ...typography.button, color: colors.text.onPrimary },
});
