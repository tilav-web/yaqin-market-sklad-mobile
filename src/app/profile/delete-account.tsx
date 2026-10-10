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
import { useTheme } from '@/stores/theme';
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
  const { colors: activeColors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: activeColors.bg.canvas }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled">
          {/* Header Description */}
          <View className="items-center py-4 px-2">
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(232, 57, 46, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <ShieldAlert size={28} color={activeColors.feedback.danger} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: activeColors.text.primary, marginBottom: 4, textAlign: 'center' }}>
              {tr('deleteAccount.title')}
            </Text>
            <Text style={{ fontSize: 14, color: activeColors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
              {tr('deleteAccount.subtitle')}
            </Text>
          </View>

          {/* Reasons List */}
          <DeleteAccountReasons
            selectedReason={selectedReason}
            onSelectReason={setSelectedReason}
          />

          {/* Optional Text Details */}
          {selectedReason && (
            <View
              style={{
                backgroundColor: activeColors.bg.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: activeColors.border.subtle,
              }}
            >
              <TextInput
                style={{ fontSize: 14, color: activeColors.text.primary, minHeight: 70 }}
                placeholder={tr('deleteAccount.feedbackPlaceholder')}
                placeholderTextColor={activeColors.text.tertiary}
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
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: agreed ? activeColors.brand.primary : activeColors.bg.surface,
                borderColor: agreed ? activeColors.brand.primary : activeColors.border.default,
              }}>
              {agreed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: activeColors.text.primary, lineHeight: 16 }}>
              {tr('deleteAccount.agreeCheckbox')}
            </Text>
          </Pressable>

          {/* Action Button */}
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 48,
              borderRadius: 12,
              marginTop: 8,
              backgroundColor: isFormValid && !deleteMutation.isPending ? activeColors.feedback.danger : activeColors.border.subtle,
            }}
            disabled={!isFormValid || deleteMutation.isPending}
            onPress={handleConfirmDelete}>
            <Trash2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
              {deleteMutation.isPending ? tr('common.loading') : tr('auth.deleteAccountAction')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
