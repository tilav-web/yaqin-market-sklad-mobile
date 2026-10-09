import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, ShieldAlert, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DeleteAccountReasons,
  ReasonKey,
} from '@/components/profile/DeleteAccountReasons';
import { DeleteAccountWarning } from '@/components/profile/DeleteAccountWarning';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

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
      Alert.alert('Diqqat', "Hisob o'chirilishi shartlariga rozilik bildirishingiz lozim.");
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
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled">
          {/* Header Description */}
          <View className="items-center py-4 px-2">
            <View className="w-16 h-16 rounded-full bg-red-500/10 items-center justify-center mb-3">
              <ShieldAlert size={28} color={colors.feedback.danger} strokeWidth={2} />
            </View>
            <Text className="text-xl font-bold text-text-primary mb-1 text-center">{tr('deleteAccount.title')}</Text>
            <Text className="text-sm text-text-secondary text-center leading-5">{tr('deleteAccount.subtitle')}</Text>
          </View>

          {/* Reasons List */}
          <DeleteAccountReasons
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
          />

          {/* Optional Text Details */}
          {selectedReason && (
            <View className="bg-surface rounded-xl p-3 border border-border-subtle">
              <TextInput
                className="text-sm text-text-primary min-h-[70px]"
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
          <DeleteAccountWarning />

          {/* Agreement Checkbox */}
          <Pressable
            className="flex-row items-center gap-3 py-2 px-1"
            onPress={() => {
              haptics.selection();
              setAgreed(!agreed);
            }}>
            <View
              className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${
                agreed ? 'bg-brand-primary border-brand-primary' : 'border-border bg-surface'
              }`}>
              {agreed && <Check size={14} color={colors.text.onPrimary} strokeWidth={3} />}
            </View>
            <Text className="flex-1 text-xs text-text-primary font-medium leading-4">
              {tr('deleteAccount.agreeCheckbox')}
            </Text>
          </Pressable>

          {/* Action Button */}
          <Pressable
            className={`flex-row items-center justify-center gap-2 h-12 rounded-xl mt-2 ${
              isFormValid && !deleteMutation.isPending ? 'bg-red-600' : 'bg-surface-disabled'
            }`}
            disabled={!isFormValid || deleteMutation.isPending}
            onPress={handleConfirmDelete}>
            <Trash2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text className="text-base font-bold text-white">
              {deleteMutation.isPending ? tr('common.loading') : tr('auth.deleteAccountAction')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
