import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Lock } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AVATAR_GROUPS, avatarEmoji } from '@/constants/avatars';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { MeUser } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function EditProfileScreen() {
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const me = qc.getQueryData<MeUser>(['me']);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<MeUser>('/users/me');
      return res.data;
    },
    initialData: me,
  });
  const user = meQuery.data;

  const [name, setName] = useState(user?.name ?? '');
  const [avatarId, setAvatarId] = useState<string | null>(user?.avatarUrl ?? null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch<MeUser>('/users/me', {
        name: name.trim(),
        avatarUrl: avatarId ?? undefined,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['me'], updated);
      qc.invalidateQueries({ queryKey: ['me'] });
      haptics.success();
      router.back();
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const previewEmoji = avatarEmoji(avatarId);
  const initial = (name?.[0] ?? user?.phone?.slice(-2) ?? 'Y').toUpperCase();
  const canSave = name.trim().length > 0;

  const pick = (id: string) => {
    haptics.selection();
    setAvatarId(id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Live preview */}
        <View style={styles.previewWrap}>
          <View style={[styles.previewAvatar, previewEmoji ? styles.previewAvatarEmoji : null]}>
            {previewEmoji ? (
              <Text style={styles.previewEmoji}>{previewEmoji}</Text>
            ) : (
              <Text style={styles.previewInitial}>{initial}</Text>
            )}
          </View>
        </View>

        {/* Name */}
        <Text style={styles.label}>{tr('editProfile.name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={tr('editProfile.namePlaceholder')}
          placeholderTextColor={colors.text.hint}
          maxLength={128}
          returnKeyType="done"
        />

        {/* Phone (read-only) */}
        <Text style={styles.label}>{tr('editProfile.phone')}</Text>
        <View style={styles.phoneBox}>
          <Text style={styles.phoneText}>{user?.phone}</Text>
          <Lock size={15} color={colors.text.tertiary} strokeWidth={2.2} />
        </View>
        <Text style={styles.hint}>{tr('editProfile.phoneLocked')}</Text>

        {/* Avatar picker */}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>{tr('editProfile.chooseAvatar')}</Text>
        {AVATAR_GROUPS.map((group) => (
          <View key={group.titleKey} style={styles.group}>
            <Text style={styles.groupTitle}>{tr(group.titleKey)}</Text>
            <View style={styles.grid}>
              {group.options.map((opt) => {
                const active = avatarId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => pick(opt.id)}
                    style={[styles.avatarCell, active && styles.avatarCellActive]}>
                    <Text style={styles.avatarEmoji}>{opt.emoji}</Text>
                    {active && (
                      <View style={styles.checkDot}>
                        <Check size={11} color={colors.text.onPrimary} strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          disabled={!canSave || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}>
          <Text style={styles.saveText}>
            {saveMutation.isPending ? tr('editProfile.saving') : tr('common.save')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  previewWrap: { alignItems: 'center', marginBottom: spacing.lg },
  previewAvatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    borderWidth: 3,
    borderColor: colors.brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarEmoji: { backgroundColor: colors.brand.primarySurface, borderColor: colors.brand.primaryBorder },
  previewEmoji: { fontSize: 52 },
  previewInitial: { color: colors.text.onPrimary, fontSize: 36, fontWeight: '800' },
  label: { ...typography.overline, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  phoneBox: {
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneText: { ...typography.body, color: colors.text.secondary },
  hint: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.xs },
  group: { marginTop: spacing.md },
  groupTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.text.secondary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  avatarCell: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCellActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  avatarEmoji: { fontSize: 30 },
  checkDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    borderWidth: 2,
    borderColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  saveBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveText: { ...typography.body, color: colors.text.onPrimary, fontWeight: '700' },
});
