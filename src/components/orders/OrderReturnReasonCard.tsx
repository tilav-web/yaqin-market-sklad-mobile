import { RotateCcw } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, typography } from '@/theme';

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
    <View
      className="p-4 rounded-2xl border gap-3"
      style={{
        backgroundColor: colors.bg.surface,
        borderColor: colors.border.subtle,
      }}
    >
      <View className="flex-row items-center gap-1.5">
        <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
        <Text className="text-base font-bold" style={{ color: colors.text.primary }}>
          {tr('orderDet.returnedTitle')}
        </Text>
      </View>
      {returnReason ? (
        <Text className="italic" style={[typography.body, { color: colors.text.secondary }]}>
          "{returnReason}"
        </Text>
      ) : (
        <>
          <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
            {tr('orderDet.returnReasonHint')}
          </Text>
          <TextInput
            className="border rounded-xl p-3"
            style={[typography.body, { borderColor: colors.border.default, backgroundColor: colors.bg.canvas }]}
            placeholder={tr('orderDet.returnReasonPlaceholder')}
            placeholderTextColor={colors.text.hint}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          {draft.trim().length > 0 && (
            <Pressable
              className="h-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: colors.brand.primary }}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={[typography.button, { color: colors.text.onPrimary }]}>
                  {tr('orderDet.saveReason')}
                </Text>
              )}
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
