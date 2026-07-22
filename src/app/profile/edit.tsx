import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Calendar, Check, Lock } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AVATAR_OPTIONS, avatarSource } from '@/constants/avatars';
import { DatePickerModal } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { MeUser } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

// Best-effort split for users who only ever had the old combined "name"
// field — first word becomes the given name, the rest the surname. Purely a
// starting point; the user can correct it like any other prefilled field.
function splitLegacyName(name: string | null): { first: string; last: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

const MIN_AGE_YEARS = 5;

/** Latest birth date that still makes someone at least MIN_AGE_YEARS old today. */
function maxBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  const legacy = splitLegacyName(user?.name ?? null);

  const [firstName, setFirstName] = useState(user?.firstName ?? legacy.first);
  const [lastName, setLastName] = useState(user?.lastName ?? legacy.last);
  const [birthDate, setBirthDate] = useState<string | null>(user?.birthDate ?? null);
  const [gender, setGender] = useState<'male' | 'female' | null>(user?.gender ?? null);
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarId, setAvatarId] = useState<string | null>(user?.avatarUrl ?? null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch<MeUser>('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        birthDate: birthDate ?? undefined,
        gender: gender ?? undefined,
        email: email.trim() || undefined,
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
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const previewSource = avatarSource(avatarId);
  const initial = (firstName?.[0] ?? user?.phone?.slice(-2) ?? 'Y').toUpperCase();
  const canSave = firstName.trim().length > 0;
  // Once a gender is picked, only show avatars drawn for it — the full set
  // (mixed) stays visible until then rather than guessing.
  const visibleAvatars = gender ? AVATAR_OPTIONS.filter((a) => a.gender === gender) : AVATAR_OPTIONS;

  const pick = (id: string) => {
    haptics.selection();
    setAvatarId(id);
  };

  const pickGender = (g: 'male' | 'female') => {
    haptics.selection();
    const next = gender === g ? null : g;
    setGender(next);
    // The avatar follows the gender — auto-pick a default from the new set
    // rather than leaving a (possibly now-hidden) mismatched selection.
    setAvatarId(next ? (AVATAR_OPTIONS.find((a) => a.gender === next)?.id ?? null) : null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Live preview */}
        <View style={styles.previewWrap}>
          <View style={styles.previewAvatar}>
            {previewSource ? (
              <Image source={previewSource} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <Text style={styles.previewInitial}>{initial}</Text>
            )}
          </View>
        </View>

        {/* Last name */}
        <Text style={styles.label}>{tr('editProfile.lastName')}</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder={tr('editProfile.lastNamePlaceholder')}
          placeholderTextColor={colors.text.hint}
          maxLength={64}
          returnKeyType="next"
        />

        {/* First name */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>{tr('editProfile.name')}</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder={tr('editProfile.namePlaceholder')}
          placeholderTextColor={colors.text.hint}
          maxLength={64}
          returnKeyType="done"
        />

        {/* Birth date */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>{tr('editProfile.birthDate')}</Text>
        <Pressable style={styles.dateBox} onPress={() => setDatePickerVisible(true)}>
          <Text style={birthDate ? styles.dateText : styles.datePlaceholder}>
            {birthDate ? new Date(`${birthDate}T00:00:00`).toLocaleDateString() : tr('editProfile.selectDate')}
          </Text>
          <Calendar size={18} color={colors.text.tertiary} strokeWidth={2.2} />
        </Pressable>

        {/* Gender */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>{tr('editProfile.gender')}</Text>
        <View style={styles.genderRow}>
          <Pressable
            style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
            onPress={() => pickGender('male')}>
            <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
              {tr('editProfile.male')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
            onPress={() => pickGender('female')}>
            <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
              {tr('editProfile.female')}
            </Text>
          </Pressable>
        </View>

        {/* Phone (read-only) */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>{tr('editProfile.phone')}</Text>
        <View style={styles.phoneBox}>
          <Text style={styles.phoneText}>{user?.phone}</Text>
          <Lock size={15} color={colors.text.tertiary} strokeWidth={2.2} />
        </View>
        <Text style={styles.hint}>{tr('editProfile.phoneLocked')}</Text>

        {/* Email */}
        <Text style={[styles.label, { marginTop: spacing.md }]}>{tr('editProfile.email')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={tr('editProfile.emailPlaceholder')}
          placeholderTextColor={colors.text.hint}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={255}
          returnKeyType="done"
        />

        {/* Avatar picker */}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>{tr('editProfile.chooseAvatar')}</Text>
        <View style={styles.grid}>
          {visibleAvatars.map((opt) => {
            const active = avatarId === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => pick(opt.id)}
                style={[styles.avatarCell, active && styles.avatarCellActive]}>
                <View style={styles.avatarCellImageWrap}>
                  <Image source={opt.source} style={styles.avatarCellImage} resizeMode="cover" />
                </View>
                {active && (
                  <View style={styles.checkDot}>
                    <Check size={11} color={colors.text.onPrimary} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
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

      <DatePickerModal
        visible={datePickerVisible}
        value={birthDate}
        title={tr('editProfile.birthDate')}
        maxDate={maxBirthDate()}
        onConfirm={(iso) => {
          setBirthDate(iso);
          setDatePickerVisible(false);
        }}
        onClose={() => setDatePickerVisible(false)}
      />
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
    overflow: 'hidden',
    backgroundColor: colors.brand.primary,
    borderWidth: 3,
    borderColor: colors.brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: 90, height: 90, borderRadius: radius.full },
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
  dateBox: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { ...typography.body, color: colors.text.primary },
  datePlaceholder: { ...typography.body, color: colors.text.hint },
  genderRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  genderBtn: {
    flex: 1,
    height: layout.inputHeight - 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: { backgroundColor: colors.bg.surface, ...shadow.xs },
  genderText: { ...typography.body, color: colors.text.secondary, fontWeight: '600' },
  genderTextActive: { color: colors.brand.primary, fontWeight: '700' },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  avatarCell: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCellActive: { borderColor: colors.brand.primary },
  avatarCellImageWrap: { width: 56, height: 56, borderRadius: radius.full, overflow: 'hidden' },
  avatarCellImage: { width: '100%', height: '100%' },
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
