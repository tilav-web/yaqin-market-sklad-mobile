import { router } from 'expo-router';
import { ChevronRight, LogIn, Settings } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { avatarSource } from '@/constants/avatars';
import { useTranslation } from '@/i18n';
import { MeUser } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { colors, hitSlop, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface ProfileHeaderProps {
  isGuest: boolean;
  user: MeUser | undefined;
}

export function ProfileHeader({ isGuest, user }: ProfileHeaderProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  if (isGuest) {
    return (
      <Pressable
        className="flex-row items-center gap-4 p-4 rounded-xl border-[1.5px]"
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
          className="w-14 h-14 rounded-full items-center justify-center"
          style={{ backgroundColor: activeColors.brand.primarySurface }}
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

  return (
    <View
      className="p-4 rounded-3xl gap-4"
      style={{ backgroundColor: colors.brand.primary }}
    >
      <View className="flex-row items-center justify-between">
        <View className="w-9" />
        <Text style={[typography.h3, { color: colors.text.onPrimary }]}>{tr('tab.profile')}</Text>
        <Pressable
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          hitSlop={hitSlop}
          onPress={() => {
            haptics.selection();
            router.push('/profile/edit');
          }}
        >
          <Settings size={20} color={colors.text.onPrimary} strokeWidth={2.2} />
        </Pressable>
      </View>

      <Pressable
        className="flex-row items-center gap-4"
        onPress={() => {
          haptics.selection();
          router.push('/profile/edit');
        }}
      >
        <View className="w-16 h-16 rounded-full overflow-hidden relative">
          {avatarSource(user?.avatarUrl) ? (
            <Image
              source={avatarSource(user?.avatarUrl)!}
              className="w-16 h-16"
              resizeMode="cover"
            />
          ) : (
            <View className="w-16 h-16 bg-white/95 items-center justify-center">
              <Text className="text-2xl font-extrabold" style={{ color: colors.brand.primary }}>
                {(user?.name?.[0] ?? user?.phone?.slice(-2) ?? 'Y').toUpperCase()}
              </Text>
            </View>
          )}
          {!user?.name && (
            <View className="absolute inset-x-0 bottom-0 bg-black/45 py-1 items-center">
              <Text className="text-[9px] font-bold" style={{ color: colors.text.onPrimary }} numberOfLines={1}>
                {tr('profile.fixProfile')}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-shrink" style={[typography.h3, { color: colors.text.onPrimary }]} numberOfLines={1}>
              {user?.name || tr('profile.namePrompt')}
            </Text>
            {user?.isAdmin && <Badge label="ADMIN" tone="info" />}
          </View>
          <Text className="mt-0.5 text-white/85" style={typography.bodySmall}>
            {user?.phone}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
