import { router } from 'expo-router';
import { ChevronRight, LogIn, Settings } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { avatarSource } from '@/constants/avatars';
import { useTranslation } from '@/i18n';
import { MeUser } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { colors, hitSlop, radius, spacing, typography } from '@/theme';
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
        style={[
          styles.guestCard,
          {
            backgroundColor: activeColors.bg.surface,
            borderColor: activeColors.brand.primaryBorder,
          },
        ]}
        onPress={() => {
          haptics.medium();
          router.push('/(auth)/phone');
        }}
      >
        <View style={[styles.guestIcon, { backgroundColor: activeColors.brand.primarySurface }]}>
          <LogIn size={24} color={activeColors.brand.primary} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.guestTitle, { color: activeColors.brand.primary }]}>
            {tr('profile.guest.title')}
          </Text>
          <Text style={[styles.guestSub, { color: activeColors.text.secondary }]}>
            {tr('profile.guest.sub')}
          </Text>
        </View>
        <ChevronRight size={18} color={activeColors.brand.primary} strokeWidth={2.4} />
      </Pressable>
    );
  }

  return (
    <View style={styles.headerBanner}>
      <View style={styles.topRow}>
        <View style={styles.topRowSpacer} />
        <Text style={styles.bannerTitle}>{tr('tab.profile')}</Text>
        <Pressable
          style={styles.gearBtn}
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
        style={styles.headerRow}
        onPress={() => {
          haptics.selection();
          router.push('/profile/edit');
        }}
      >
        <View style={styles.avatarWrap}>
          {avatarSource(user?.avatarUrl) ? (
            <Image
              source={avatarSource(user?.avatarUrl)!}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {(user?.name?.[0] ?? user?.phone?.slice(-2) ?? 'Y').toUpperCase()}
              </Text>
            </View>
          )}
          {!user?.name && (
            <View style={styles.fixCaption}>
              <Text style={styles.fixCaptionText} numberOfLines={1}>
                {tr('profile.fixProfile')}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || tr('profile.namePrompt')}
            </Text>
            {user?.isAdmin && <Badge label="ADMIN" tone="info" />}
          </View>
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.bg.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
  },
  guestIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: { ...typography.h3, color: colors.brand.primary },
  guestSub: { ...typography.bodySmall, color: colors.text.secondary, marginTop: 2 },
  headerBanner: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRowSpacer: { width: 36 },
  bannerTitle: { ...typography.h3, color: colors.text.onPrimary },
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  avatarImage: { width: 64, height: 64 },
  avatarFallback: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brand.primary, fontSize: 24, fontWeight: '800' },
  fixCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  fixCaptionText: { fontSize: 9, fontWeight: '700', color: colors.text.onPrimary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h3, color: colors.text.onPrimary, flexShrink: 1 },
  phone: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
