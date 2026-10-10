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
import { useTheme } from '@/stores/theme';
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

  const { colors: activeColors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: activeColors.bg.canvas }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Live preview */}
        <View className="items-center py-4">
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: activeColors.brand.primary,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: '#FFFFFF',
              elevation: 4,
            }}
          >
            {previewSource ? (
              <Image source={previewSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Text className="text-3xl font-extrabold text-white">{initial}</Text>
            )}
          </View>
        </View>

        {/* Last name */}
        <View className="gap-1.5">
          <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tr('editProfile.lastName')}
          </Text>
          <TextInput
            style={{
              backgroundColor: activeColors.bg.surface,
              borderColor: activeColors.border.default,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: activeColors.text.primary,
            }}
            value={lastName}
            onChangeText={setLastName}
            placeholder={tr('editProfile.lastNamePlaceholder')}
            placeholderTextColor={activeColors.text.hint}
            maxLength={64}
            returnKeyType="next"
          />
        </View>

        {/* First name */}
        <View className="gap-1.5">
          <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tr('editProfile.name')}
          </Text>
          <TextInput
            style={{
              backgroundColor: activeColors.bg.surface,
              borderColor: activeColors.border.default,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: activeColors.text.primary,
            }}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={tr('editProfile.namePlaceholder')}
            placeholderTextColor={activeColors.text.hint}
            maxLength={64}
            returnKeyType="done"
          />
        </View>

        {/* Birth date */}
        <View className="gap-1.5">
          <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tr('editProfile.birthDate')}
          </Text>
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: activeColors.bg.surface,
              borderColor: activeColors.border.default,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            onPress={() => setDatePickerVisible(true)}>
            <Text style={{ fontSize: 16, color: birthDate ? activeColors.text.primary : activeColors.text.hint }}>
              {birthDate ? new Date(`${birthDate}T00:00:00`).toLocaleDateString() : tr('editProfile.selectDate')}
            </Text>
            <Calendar size={18} color={activeColors.text.tertiary} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Gender */}
        <View className="gap-1.5">
          <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tr('editProfile.gender')}
          </Text>
          <View className="flex-row gap-2.5">
            <Pressable
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1,
                backgroundColor: gender === 'male' ? activeColors.brand.primary : activeColors.bg.surface,
                borderColor: gender === 'male' ? activeColors.brand.primary : activeColors.border.default,
              }}
              onPress={() => pickGender('male')}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: gender === 'male' ? '#FFFFFF' : activeColors.text.secondary }}>
                {tr('editProfile.male')}
              </Text>
            </Pressable>
            <Pressable
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                borderWidth: 1,
                backgroundColor: gender === 'female' ? activeColors.brand.primary : activeColors.bg.surface,
                borderColor: gender === 'female' ? activeColors.brand.primary : activeColors.border.default,
              }}
              onPress={() => pickGender('female')}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: gender === 'female' ? '#FFFFFF' : activeColors.text.secondary }}>
                {tr('editProfile.female')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Phone (read-only) */}
        <View className="gap-1.5">
          <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tr('editProfile.phone')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: activeColors.bg.surfaceMuted,
              borderColor: activeColors.border.subtle,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 16, color: activeColors.text.tertiary }}>{user?.phone}</Text>
            <Lock size={15} color={activeColors.text.tertiary} strokeWidth={2.2} />
          </View>
          <Text style={{ fontSize: 12, color: activeColors.text.hint }}>{tr('editProfile.phoneLocked')}</Text>
        </View>

        {/* Email */}
        <View className="gap-1.5">
          <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tr('editProfile.email')}
          </Text>
          <TextInput
            style={{
              backgroundColor: activeColors.bg.surface,
              borderColor: activeColors.border.default,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: activeColors.text.primary,
            }}
            value={email}
            onChangeText={setEmail}
            placeholder={tr('editProfile.emailPlaceholder')}
            placeholderTextColor={activeColors.text.hint}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={255}
            returnKeyType="done"
          />
        </View>

        {/* Avatar picker */}
        <View className="gap-2 pt-2">
          <Text style={{ fontSize: 12, fontWeight: '700', color: activeColors.text.primary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {tr('editProfile.chooseAvatar')}
          </Text>
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
          style={{
            height: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16,
            backgroundColor: canSave && !saveMutation.isPending ? activeColors.brand.primary : (activeColors.border.subtle),
          }}
          disabled={!canSave || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
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
