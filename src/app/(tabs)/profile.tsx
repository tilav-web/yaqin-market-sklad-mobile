import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Globe,
  Heart,
  LogIn,
  MapPin,
  Plus,
  QrCode,
  Settings,
  Store,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguagePickerSheet, LANG_LABELS } from '@/components/LanguagePickerSheet';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { avatarSource } from '@/constants/avatars';
import { useLangStore, useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { useIsGuest, useRequireAuth } from '@/lib/useRequireAuth';
import type { WorkingForMeEntry } from '@/lib/useIsShopOwner';
import { MeUser, MyShop } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { colors, hitSlop, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface SellerApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
}

export default function ProfileTab() {
  const { tr } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const signOut = useAuthStore((s) => s.signOut);
  const isGuest = useIsGuest();
  const requireAuth = useRequireAuth();
  const [langSheetVisible, setLangSheetVisible] = useState(false);

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

  // Shops where this user works as staff (courier, cashier, …) — any user can
  // be invited regardless of seller status.
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
        }>
        {isGuest ? (
          <Pressable
            style={styles.guestCard}
            onPress={() => {
              haptics.medium();
              router.push('/(auth)/phone');
            }}>
            <View style={styles.guestIcon}>
              <LogIn size={24} color={colors.brand.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guestTitle}>{tr('profile.guest.title')}</Text>
              <Text style={styles.guestSub}>{tr('profile.guest.sub')}</Text>
            </View>
            <ChevronRight size={18} color={colors.brand.primary} strokeWidth={2.4} />
          </Pressable>
        ) : (
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
                }}>
                <Settings size={20} color={colors.text.onPrimary} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Pressable
              style={styles.headerRow}
              onPress={() => {
                haptics.selection();
                router.push('/profile/edit');
              }}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  {avatarSource(me?.avatarUrl) ? (
                    <Image source={avatarSource(me?.avatarUrl)!} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {(me?.name?.[0] ?? me?.phone?.slice(-2) ?? 'Y').toUpperCase()}
                    </Text>
                  )}
                </View>
                {!me?.name && (
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
                    {me?.name || tr('profile.namePrompt')}
                  </Text>
                  {me?.isAdmin && <Badge label="ADMIN" tone="info" />}
                </View>
                <Text style={styles.phone}>{me?.phone}</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Notifications — available to everyone (empty for guests). */}
        <Section>
          <Row
            icon={Bell}
            title={tr('notifications.title')}
            badge={isGuest ? undefined : unreadQuery.data}
            onPress={() => router.push('/notifications')}
          />
        </Section>

        {isGuest ? (
          <Section>
            <Row
              icon={Store}
              title={tr('profile.openShopShort')}
              onPress={() => requireAuth(() => router.push('/seller-application'))}
            />
            <Row
              icon={QrCode}
              title={tr('profile.joinAsStaff')}
              onPress={() => requireAuth(() => router.push('/staff-scan'))}
            />
          </Section>
        ) : null}

        {!isGuest ? (
          <>
            {(me?.isSellerApproved && myShopsQuery.data && myShopsQuery.data.length > 0) ||
            latestApp?.status === 'pending' ||
            latestApp?.status === 'rejected' ? (
              <Section>
                {me?.isSellerApproved && myShopsQuery.data
                  ? myShopsQuery.data.map((shop) => (
                      <Row
                        key={shop.id}
                        icon={Store}
                        title={shop.name}
                        subtitle={`${shop.isOpenManual ? tr('profile.openShop') : tr('profile.closedShop')} · ${shop.address}`}
                        badge={shop.newOrderCount}
                        onPress={() => router.push(`/seller/${shop.id}/orders`)}
                      />
                    ))
                  : null}

                {latestApp?.status === 'pending' ? (
                  // Application submitted, waiting for admin
                  <View style={styles.pendingCta}>
                    <View style={styles.pendingIcon}>
                      <Clock size={22} color={colors.feedback.warning} strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingTitle}>{tr('seller.pending.title')}</Text>
                      <Text style={styles.applySub}>{tr('seller.pending.desc')}</Text>
                    </View>
                  </View>
                ) : latestApp?.status === 'rejected' ? (
                  // Application rejected — show reason + retry button
                  <Pressable
                    onPress={() => {
                      haptics.medium();
                      router.push('/seller-application');
                    }}
                    style={styles.rejectedCta}>
                    <View style={styles.rejectedIcon}>
                      <XCircle size={22} color={colors.brand.primary} strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rejectedTitle}>{tr('seller.rejected.title')}</Text>
                      {latestApp.rejectionReason ? (
                        <Text style={styles.applySub}>
                          {tr('seller.rejected.reason', { reason: latestApp.rejectionReason })}
                        </Text>
                      ) : null}
                      <Text style={styles.retryText}>Qayta ariza yuborish →</Text>
                    </View>
                  </Pressable>
                ) : null}
              </Section>
            ) : null}

            {staffShops.length > 0 ? (
              <Section>
                {staffShops.map(({ shop, role }) => (
                  <Row
                    key={shop.id}
                    icon={Store}
                    title={shop.name}
                    subtitle={`${role ?? tr('profile.staffRole')} · ${shop.address}`}
                    onPress={() => router.push(`/seller/${shop.id}/orders`)}
                  />
                ))}
              </Section>
            ) : null}

            <Section>
              <Row icon={MapPin} title={tr('profile.addresses')} onPress={() => router.push('/addresses')} />
              <Row icon={CreditCard} title={tr('cards.title')} onPress={() => router.push('/saved-cards')} />
              <Row icon={ClipboardList} title={tr('profile.orders')} onPress={() => router.push('/orders')} />
              <Row icon={Heart} title="Sevimlilar" onPress={() => router.push('/favorites')} />
              {me?.isSellerApproved ? (
                <Row icon={Plus} title={tr('profile.openShopShort')} onPress={() => router.push('/seller/new')} />
              ) : latestApp?.status !== 'pending' && latestApp?.status !== 'rejected' ? (
                <Row
                  icon={Store}
                  title={tr('profile.openShopShort')}
                  onPress={() => requireAuth(() => router.push('/seller-application'))}
                />
              ) : null}
              <Row icon={QrCode} title={tr('profile.joinAsStaff')} onPress={() => router.push('/staff-scan')} />
            </Section>
          </>
        ) : null}

        <Section>
          <Row
            icon={Globe}
            title={tr('profile.language')}
            value={LANG_LABELS[lang]}
            onPress={() => setLangSheetVisible(true)}
          />
        </Section>

        {!isGuest && (
          <Pressable
            style={styles.logoutBtn}
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
            }}>
            <Text style={styles.logoutText}>{tr('auth.signOut')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <LanguagePickerSheet
        visible={langSheetVisible}
        value={lang}
        onSelect={setLang}
        onClose={() => setLangSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

interface SectionProps {
  children: React.ReactNode;
}
function Section({ children }: SectionProps) {
  return (
    <Card padding="none" elevation="xs">
      {children}
    </Card>
  );
}

interface RowProps {
  icon: typeof MapPin;
  title: string;
  subtitle?: string;
  titleColor?: string;
  /** Trailing value text before the chevron (e.g. current language). */
  value?: string;
  /** Optional count badge shown before the chevron (e.g. pending orders). */
  badge?: number;
  onPress: () => void;
}
function Row({ icon: Icon, title, subtitle, titleColor, value, badge, onPress }: RowProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg.surfaceMuted }]}>
      <View style={styles.rowIconWrap}>
        <Icon size={21} color={colors.text.secondary} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, titleColor && { color: titleColor }]}>{title}</Text>
        {subtitle && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {badge && badge > 0 ? (
        <View style={styles.rowBadge}>
          <Text style={styles.rowBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, paddingBottom: spacing['4xl'], gap: spacing.lg },
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
  avatarWrap: { width: 64, height: 64, borderRadius: radius.full, overflow: 'hidden' },
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.full },
  avatarText: { color: colors.brand.primary, fontSize: 24, fontWeight: '800' },
  name: { ...typography.h3, color: colors.text.onPrimary, flexShrink: 1 },
  phone: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  rowIconWrap: { width: 26, alignItems: 'center' },
  rowTitle: { ...typography.bodyStrong },
  rowSub: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  rowValue: { ...typography.body, color: colors.text.tertiary },
  rowBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: radius.full,
    backgroundColor: colors.brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: { color: colors.text.onPrimary, fontSize: 13, fontWeight: '800' },
  applySub: { ...typography.bodySmall, color: colors.text.secondary, marginTop: 2 },
  pendingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.feedback.warningSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: { ...typography.h4, color: colors.feedback.warning },
  rejectedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brand.primarySurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rejectedIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedTitle: { ...typography.h4, color: colors.brand.primary },
  retryText: { ...typography.bodySmall, color: colors.brand.primary, fontWeight: '800', marginTop: spacing.xs },
  dim: { ...typography.bodySmall, padding: spacing.lg, color: colors.text.secondary },
  logoutBtn: {
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { ...typography.button, color: colors.text.onPrimary },
});
