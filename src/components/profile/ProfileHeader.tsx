import { router } from 'expo-router';
import { Camera, ChevronRight, LogIn, Pencil, Settings } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { avatarSource } from '@/constants/avatars';
import { useTranslation } from '@/i18n';
import { MeUser } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { hitSlop, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface ProfileHeaderProps {
  readonly isGuest: boolean;
  readonly user: MeUser | undefined;
}

export function ProfileHeader({ isGuest, user }: ProfileHeaderProps) {
  const { tr } = useTranslation();
  const { colors: activeColors, isDark } = useTheme();

  if (isGuest) {
    return (
      <Pressable
        className="flex-row items-center gap-4 p-4 rounded-2xl border-[1.5px]"
        style={{
          backgroundColor: activeColors.bg.surface,
          borderColor: activeColors.brand.primaryBorder,
        }}
        onPress={() => {
          haptics.medium();
          router.push('/(auth)/phone');
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: activeColors.brand.primarySurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogIn size={24} color={activeColors.brand.primary} strokeWidth={2.4} />
        </View>
        <View className="flex-1">
          <Text style={[typography.h3, { color: activeColors.brand.primary }]}>
            {tr('profile.guest.title')}
          </Text>
          <Text className="mt-0.5" style={[typography.bodySmall, { color: activeColors.text.secondary }]}>
            {tr('profile.guest.sub')}
          </Text>
        </View>
        <ChevronRight size={18} color={activeColors.brand.primary} strokeWidth={2.4} />
      </Pressable>
    );
  }

  const avatar = avatarSource(user?.avatarUrl);
  const initial = (user?.name?.[0] ?? user?.phone?.slice(-2) ?? 'Y').toUpperCase();

  return (
    <View
      className="p-5 rounded-3xl"
      style={{
        backgroundColor: activeColors.brand.primary,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
        shadowColor: '#E8392E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.35 : 0.22,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
      {/* Top Bar: Title & Settings */}
      <View className="flex-row items-center justify-between mb-4">
        <Text style={[typography.h3, { color: '#FFFFFF', fontSize: 18 }]}>
          {tr('tab.profile')}
        </Text>
        <Pressable
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          hitSlop={hitSlop}
          onPress={() => {
            haptics.selection();
            router.push('/profile/edit');
          }}
        >
          <Settings size={19} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Main Profile Info Row */}
      <Pressable
        className="flex-row items-center gap-4"
        onPress={() => {
          haptics.selection();
          router.push('/profile/edit');
        }}
      >
        {/* Avatar with clear white border and camera badge */}
        <View style={{ position: 'relative' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              borderWidth: 3,
              borderColor: '#FFFFFF',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatar ? (
              <Image
                source={avatar}
                style={{ width: 66, height: 66, borderRadius: 33 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 33,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '800', color: activeColors.brand.primary }}>
                  {initial}
                </Text>
              </View>
            )}
          </View>

          {/* Camera / Edit Badge */}
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: activeColors.brand.primary,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 3,
            }}
          >
            <Camera size={13} color={activeColors.brand.primary} strokeWidth={2.4} />
          </View>
        </View>

        {/* User Name, Phone & Status */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              style={[
                typography.h3,
                { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {user?.name || tr('profile.namePrompt')}
            </Text>
            {user?.isAdmin && <Badge label="ADMIN" tone="info" />}
          </View>

          <Text
            className="mt-0.5"
            style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.88)', fontWeight: '500' }}
          >
            {user?.phone}
          </Text>

          {!user?.name && (
            <View
              className="flex-row items-center gap-1.5 mt-2 self-start px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Pencil size={11} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '600' }}>
                {tr('profile.fixProfile') || "Profilni to'ldirish"}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron right to indicate clickability */}
        <ChevronRight size={20} color="rgba(255, 255, 255, 0.75)" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
