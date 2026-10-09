import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Calendar, Lock } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AVATAR_OPTIONS, avatarSource } from '@/constants/avatars';
import { ProfileAvatarPicker } from '@/components/profile/ProfileAvatarPicker';
import { DatePickerModal } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { MeUser } from '@/lib/types';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

function splitLegacyName(name: string | null): { first: string; last: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

const MIN_AGE_YEARS = 5;

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

  const pickGender = (g: 'male' | 'female') => {
    haptics.selection();
    const next = gender === g ? null : g;
    setGender(next);
    setAvatarId(next ? (AVATAR_OPTIONS.find((a) => a.gender === next)?.id ?? null) : null);
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Live preview */}
        <View className="items-center py-4">
          <View className="w-24 h-24 rounded-full bg-brand-primary items-center justify-center overflow-hidden border-2 border-brand-primary shadow-sm">
            {previewSource ? (
              <Image source={previewSource} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-3xl font-extrabold text-white">{initial}</Text>
            )}
          </View>
        </View>

        {/* Last name */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('editProfile.lastName')}</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
            value={lastName}
            onChangeText={setLastName}
            placeholder={tr('editProfile.lastNamePlaceholder')}
            placeholderTextColor={colors.text.hint}
            maxLength={64}
            returnKeyType="next"
          />
        </View>

        {/* First name */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('editProfile.name')}</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
            value={firstName}
            onChangeText={setFirstName}
            placeholder={tr('editProfile.namePlaceholder')}
            placeholderTextColor={colors.text.hint}
            maxLength={64}
            returnKeyType="done"
          />
        </View>

        {/* Birth date */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('editProfile.birthDate')}</Text>
          <Pressable
            className="flex-row items-center justify-between bg-surface rounded-xl px-4 py-3 border border-border"
            onPress={() => setDatePickerVisible(true)}>
            <Text className={`text-base ${birthDate ? 'text-text-primary' : 'text-text-hint'}`}>
              {birthDate ? new Date(`${birthDate}T00:00:00`).toLocaleDateString() : tr('editProfile.selectDate')}
            </Text>
            <Calendar size={18} color={colors.text.tertiary} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Gender */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('editProfile.gender')}</Text>
          <View className="flex-row gap-2.5">
            <Pressable
              className={`flex-1 py-3 rounded-xl items-center border ${
                gender === 'male' ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border'
              }`}
              onPress={() => pickGender('male')}>
              <Text className={`text-sm font-bold ${gender === 'male' ? 'text-white' : 'text-text-secondary'}`}>
                {tr('editProfile.male')}
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 py-3 rounded-xl items-center border ${
                gender === 'female' ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border'
              }`}
              onPress={() => pickGender('female')}>
              <Text className={`text-sm font-bold ${gender === 'female' ? 'text-white' : 'text-text-secondary'}`}>
                {tr('editProfile.female')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Phone (read-only) */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('editProfile.phone')}</Text>
          <View className="flex-row items-center justify-between bg-surface-muted rounded-xl px-4 py-3 border border-border-subtle">
            <Text className="text-base text-text-tertiary">{user?.phone}</Text>
            <Lock size={15} color={colors.text.tertiary} strokeWidth={2.2} />
          </View>
          <Text className="text-xs text-text-hint">{tr('editProfile.phoneLocked')}</Text>
        </View>

        {/* Email */}
        <View className="gap-1.5">
          <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('editProfile.email')}</Text>
          <TextInput
            className="bg-surface rounded-xl px-4 py-3 text-base text-text-primary border border-border"
            value={email}
            onChangeText={setEmail}
            placeholder={tr('editProfile.emailPlaceholder')}
            placeholderTextColor={colors.text.hint}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={255}
            returnKeyType="done"
          />
        </View>

        {/* Avatar picker */}
        <View className="gap-2 pt-2">
          <Text className="text-xs font-bold text-text-primary uppercase tracking-wider">{tr('editProfile.chooseAvatar')}</Text>
          <ProfileAvatarPicker
            gender={gender}
            selectedId={avatarId}
            onSelect={(id) => {
              haptics.selection();
              setAvatarId(id);
            }}
          />
        </View>

        {/* Save button */}
        <Pressable
          className={`h-12 rounded-xl items-center justify-center mt-4 ${
            canSave && !saveMutation.isPending ? 'bg-brand-primary' : 'bg-surface-disabled'
          }`}
          disabled={!canSave || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}>
          <Text className="text-base font-bold text-white">
            {saveMutation.isPending ? tr('editProfile.saving') : tr('common.save')}
          </Text>
        </Pressable>
      </ScrollView>

      <DatePickerModal
        visible={datePickerVisible}
        value={birthDate ?? ''}
        title={tr('editProfile.birthDate')}
        maxDate={maxBirthDate()}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(iso) => {
          setBirthDate(iso);
          setDatePickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
