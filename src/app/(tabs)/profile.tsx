import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bell,
  ClipboardList,
  CreditCard,
  Globe,
  Heart,
  MapPin,
  Moon,
  QrCode,
  ShieldAlert,
  Store,
  Sun,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguagePickerSheet, LANG_LABELS } from '@/components/LanguagePickerSheet';
import { ThemePickerSheet } from '@/components/ThemePickerSheet';
import {
  ProfileHeader,
  ProfileMenuRow,
  ProfileMenuSection,
  ProfileSellerSection,
  ProfileStaffSection,
  SellerApplication,
} from '@/components/profile';
import { useLangStore, useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { useIsGuest, useRequireAuth } from '@/lib/useRequireAuth';
import type { WorkingForMeEntry } from '@/lib/useIsShopOwner';
import { MeUser, MyShop } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/stores/theme';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function ProfileTab() {
  const { tr } = useTranslation();
  const { mode, setMode, isDark, colors: activeColors } = useTheme();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const signOut = useAuthStore((s) => s.signOut);
  const isGuest = useIsGuest();
  const requireAuth = useRequireAuth();
  const [langSheetVisible, setLangSheetVisible] = useState(false);
  const [themeSheetVisible, setThemeSheetVisible] = useState(false);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<MeUser>('/users/me');
      return res.data;
    },
    enabled: !isGuest,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      return res.data.count;
    },
    enabled: !isGuest,
    refetchInterval: 30_000,
  });

  const myShopsQuery = useQuery({
    queryKey: ['shops', 'mine'],
    queryFn: async () => {
      const res = await api.get<MyShop[]>('/seller/shops/mine');
      return res.data;
    },
    enabled: !!meQuery.data?.isSellerApproved,
  });

  const myApplicationsQuery = useQuery({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const res = await api.get<SellerApplication[]>('/sellers/my-applications');
      return res.data;
    },
    enabled: !!meQuery.data && !meQuery.data.isSellerApproved,
  });

  const staffShopsQuery = useQuery({
    queryKey: ['working-for-me'],
    queryFn: async () => {
      const res = await api.get<WorkingForMeEntry[]>('/seller/shops/working-for-me');
      return res.data;
    },
    enabled: !isGuest,
  });

  const me = meQuery.data;
  const latestApp = myApplicationsQuery.data?.[0];
  const staffShops = staffShopsQuery.data ?? [];
  const myShops = myShopsQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: activeColors.bg.canvas }} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isGuest ? undefined : (
            <RefreshControl
              refreshing={meQuery.isFetching && !meQuery.isLoading}
              onRefresh={() => {
                void meQuery.refetch();
                void myShopsQuery.refetch();
                void staffShopsQuery.refetch();
                void unreadQuery.refetch();
              }}
              tintColor={colors.brand.primary}
              colors={[colors.brand.primary]}
            />
          )
        }
      >
        {/* Header / Guest banner */}
        <ProfileHeader isGuest={isGuest} user={me} />

        {/* Notifications */}
        <ProfileMenuSection>
          <ProfileMenuRow
            icon={Bell}
            title={tr('notifications.title')}
            badge={isGuest ? undefined : unreadQuery.data}
            borderBottom={false}
            onPress={() => router.push('/notifications')}
          />
        </ProfileMenuSection>

        {isGuest ? (
          <ProfileMenuSection>
            <ProfileMenuRow
              icon={Store}
              title={tr('profile.openShopShort')}
              onPress={() => requireAuth(() => router.push('/seller-application'))}
            />
            <ProfileMenuRow
              icon={QrCode}
              title={tr('profile.joinAsStaff')}
              borderBottom={false}
              onPress={() => requireAuth(() => router.push('/staff-scan'))}
            />
          </ProfileMenuSection>
        ) : null}

        {!isGuest ? (
          <>
            {/* Seller shops & applications */}
            <ProfileSellerSection
              myShops={myShops}
              latestApp={latestApp}
              onOpenApplication={() => requireAuth(() => router.push('/seller-application'))}
            />

            {/* Staff member shops */}
            <ProfileStaffSection staffShops={staffShops} />

            {/* Customer links */}
            <ProfileMenuSection>
              <ProfileMenuRow icon={MapPin} title={tr('profile.addresses')} onPress={() => router.push('/addresses')} />
              <ProfileMenuRow icon={CreditCard} title={tr('cards.title')} onPress={() => router.push('/saved-cards')} />
              <ProfileMenuRow icon={ClipboardList} title={tr('profile.orders')} onPress={() => router.push('/orders')} />
              <ProfileMenuRow icon={Heart} title={tr('nav.favorites')} onPress={() => router.push('/favorites')} />
              <ProfileMenuRow
                icon={QrCode}
                title={tr('profile.joinAsStaff')}
                borderBottom={false}
                onPress={() => router.push('/staff-scan')}
              />
            </ProfileMenuSection>
          </>
        ) : null}

        {/* Settings & Preferences */}
        <ProfileMenuSection>
          <ProfileMenuRow
            icon={Globe}
            title={tr('profile.language')}
            value={LANG_LABELS[lang]}
            onPress={() => setLangSheetVisible(true)}
          />
          <ProfileMenuRow
            icon={isDark ? Moon : Sun}
            title={tr('profile.theme')}
            value={
              mode === 'dark'
                ? tr('theme.dark')
                : mode === 'light'
                ? tr('theme.light')
                : tr('theme.system')
            }
            borderBottom={!isGuest}
            onPress={() => setThemeSheetVisible(true)}
          />
          {!isGuest && (
            <ProfileMenuRow
              icon={ShieldAlert}
              title={tr('deleteAccount.title')}
              titleColor={activeColors.feedback.danger}
              borderBottom={false}
              onPress={() => router.push('/profile/delete-account')}
            />
          )}
        </ProfileMenuSection>

        {/* Sign out button */}
        {!isGuest && (
          <View className="mt-1 mb-6">
            <Pressable
              className="h-12 rounded-2xl bg-surface border border-feedback-danger items-center justify-center active:opacity-70"
              onPress={() => {
                haptics.warning();
                Alert.alert(tr('auth.signOut'), tr('auth.signOutConfirm'), [
                  { text: tr('common.cancel'), style: 'cancel' },
                  {
                    text: tr('auth.signOut'),
                    style: 'destructive',
                    onPress: () => {
                      haptics.heavy();
                      signOut();
                    },
                  },
                ]);
              }}
            >
              <Text className="text-base font-bold text-feedback-danger">{tr('auth.signOut')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <LanguagePickerSheet
        visible={langSheetVisible}
        value={lang}
        onSelect={setLang}
        onClose={() => setLangSheetVisible(false)}
      />

      <ThemePickerSheet
        visible={themeSheetVisible}
        value={mode}
        onSelect={setMode}
        onClose={() => setThemeSheetVisible(false)}
      />
    </SafeAreaView>
  );
}
