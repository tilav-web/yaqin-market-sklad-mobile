import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  AlertTriangle,
  Check,
  ShieldAlert,
  Trash2,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const REASON_KEYS = [
  'bad_experience',
  'no_nearby_shops',
  'app_bugs',
  'created_another_account',
  'privacy_concern',
  'other',
] as const;

type ReasonKey = (typeof REASON_KEYS)[number];

export default function DeleteAccountScreen() {
  const { tr } = useTranslation();
  const signOut = useAuthStore((s) => s.signOut);

  const [selectedReason, setSelectedReason] = useState<ReasonKey | null>(null);
  const [feedbackDetails, setFeedbackDetails] = useState('');
  const [agreed, setAgreed] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (payload: { reasonKey?: string; reasonDetails?: string }) => {
      const res = await api.delete<{ success: boolean; message: string }>('/users/me', {
        data: payload,
      });
      return res.data;
    },
    onSuccess: (data) => {
      haptics.success();
      signOut();
      Alert.alert(
        tr('auth.deleteAccountSuccess'),
        data.message || tr('auth.deleteAccountSuccess'),
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
    },
    onError: (err: unknown) => {
      haptics.error();
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr?.response?.data?.message ||
        axiosErr?.message ||
        "Hisobni o'chirishda xatolik yuz berdi";
      Alert.alert('Diqqat', msg);
    },
  });

  const handleConfirmDelete = () => {
    if (!selectedReason) {
      haptics.warning();
      Alert.alert('Diqqat', "Iltimos, hisobni o'chirish sababini tanlang.");
      return;
    }
    if (!agreed) {
      haptics.warning();
      Alert.alert('Diqqat', 'Hisob o\'chirilishi shartlariga rozilik bildirishingiz lozim.');
      return;
    }

    haptics.warning();
    Alert.alert(
      tr('auth.deleteAccountConfirm'),
      tr('auth.deleteAccountWarning'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('auth.deleteAccountAction'),
          style: 'destructive',
          onPress: () => {
            haptics.heavy();
            deleteMutation.mutate({
              reasonKey: selectedReason,
              reasonDetails: feedbackDetails.trim() || undefined,
            });
          },
        },
      ],
    );
  };

  const isFormValid = selectedReason !== null && agreed;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          {/* Header Description */}
          <View style={styles.headerBox}>
            <View style={styles.iconCircle}>
              <ShieldAlert size={28} color={colors.feedback.danger} strokeWidth={2} />
            </View>
            <Text style={styles.headerTitle}>{tr('deleteAccount.title')}</Text>
            <Text style={styles.headerSub}>{tr('deleteAccount.subtitle')}</Text>
          </View>

          {/* Reasons List */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>{tr('deleteAccount.reasonLabel')}</Text>
            <View style={styles.reasonsList}>
              {REASON_KEYS.map((key) => {
                const isSelected = selectedReason === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      haptics.selection();
                      setSelectedReason(key);
                    }}
                    style={[
                      styles.reasonCard,
                      isSelected && styles.reasonCardSelected,
                    ]}>
                    <View style={styles.radioWrap}>
                      {isSelected ? (
                        <View style={styles.radioSelectedDot}>
                          <View style={styles.radioInner} />
                        </View>
                      ) : (
                        <View style={styles.radioUnselectedDot} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected && styles.reasonTextSelected,
                      ]}>
                      {tr(`deleteAccount.reason.${key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Optional Text Details */}
          {selectedReason && (
            <View style={styles.feedbackWrap}>
              <TextInput
                style={styles.textInput}
                placeholder={tr('deleteAccount.feedbackPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                value={feedbackDetails}
                onChangeText={setFeedbackDetails}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Warning Banner */}
          <Card padding="md" style={styles.warningCard}>
            <View style={styles.warningHeaderRow}>
              <AlertTriangle size={18} color={colors.feedback.danger} strokeWidth={2.2} />
              <Text style={styles.warningTitle}>{tr('deleteAccount.warningTitle')}</Text>
            </View>
            <View style={styles.warningList}>
              <Text style={styles.warningItem}>• {tr('deleteAccount.warning1')}</Text>
              <Text style={styles.warningItem}>• {tr('deleteAccount.warning2')}</Text>
              <Text style={styles.warningItem}>• {tr('deleteAccount.warning3')}</Text>
            </View>
          </Card>

          {/* Agreement Checkbox */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => {
              haptics.selection();
              setAgreed((v) => !v);
            }}>
            <View
              style={[
                styles.checkboxBox,
                agreed && styles.checkboxBoxChecked,
              ]}>
              {agreed && <Check size={14} color={colors.text.onPrimary} strokeWidth={3} />}
            </View>
            <Text style={styles.checkboxLabel}>
              {tr('deleteAccount.agreeCheckbox')}
            </Text>
          </Pressable>

          {/* Actions */}
          <View style={styles.actionsWrap}>
            <Pressable
              style={[
                styles.deleteBtn,
                (!isFormValid || deleteMutation.isPending) && styles.deleteBtnDisabled,
              ]}
              disabled={!isFormValid || deleteMutation.isPending}
              onPress={handleConfirmDelete}>
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.text.onPrimary} />
              ) : (
                <>
                  <Trash2 size={18} color={colors.text.onPrimary} strokeWidth={2} />
                  <Text style={styles.deleteBtnText}>
                    {tr('deleteAccount.actionBtn')}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                haptics.selection();
                router.back();
              }}>
              <Text style={styles.cancelBtnText}>
                {tr('deleteAccount.cancelBtn')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  headerBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '800',
  },
  headerSub: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  sectionWrap: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xs,
  },
  reasonsList: {
    gap: spacing.sm,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
  },
  reasonCardSelected: {
    borderColor: colors.feedback.danger,
    backgroundColor: colors.feedback.dangerSurface,
  },
  radioWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioUnselectedDot: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  radioSelectedDot: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.feedback.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.danger,
  },
  reasonText: {
    ...typography.body,
    flex: 1,
    color: colors.text.primary,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: colors.feedback.danger,
    fontWeight: '700',
  },
  feedbackWrap: {
    marginTop: -spacing.xs,
  },
  textInput: {
    ...typography.bodySmall,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    color: colors.text.primary,
  },
  warningCard: {
    backgroundColor: colors.feedback.dangerSurface,
    borderColor: colors.feedback.danger,
    borderWidth: 1,
    gap: spacing.sm,
  },
  warningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  warningTitle: {
    ...typography.bodySmall,
    color: colors.feedback.danger,
    fontWeight: '800',
  },
  warningList: {
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  warningItem: {
    ...typography.caption,
    color: colors.text.primary,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.feedback.danger,
    borderColor: colors.feedback.danger,
  },
  checkboxLabel: {
    ...typography.bodySmall,
    color: colors.text.primary,
    flex: 1,
    fontWeight: '600',
  },
  actionsWrap: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteBtn: {
    height: layout.buttonHeight.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.feedback.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnText: {
    ...typography.button,
    color: colors.text.onPrimary,
    fontWeight: '800',
  },
  cancelBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.xl,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '700',
  },
});
