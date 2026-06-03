import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ChevronRight,
  ClipboardList,
  Clock,
  Globe,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Store,
  XCircle,
} from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { avatarEmoji } from '@/constants/avatars';
import { useLangStore, useTranslation, type Lang } from '@/i18n';
import { api } from '@/lib/api';
import { MeUser, MyShop } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { colors, hitSlop, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface SellerApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
}

interface StaffShop {
  shop: { id: string; name: string; address: string; isOpenManual: boolean };
  role: string | null;
}

const LANG_LABELS: Record<Lang, string> = {
  uz: "O'zbekcha",
  uz_cyrl: 'Ўзбекча',
  ru: 'Русский',
};

export default function ProfileTab() {
  const { tr } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const signOut = useAuthStore((s) => s.signOut);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<MeUser>('/users/me');
      return res.data;
    },
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
      const res = await api.get<StaffShop[]>('/seller/shops/working-for-me');
      return res.data;
    },
  });

  const me = meQuery.data;
  const latestApp = myApplicationsQuery.data?.[0];
  const staffShops = staffShopsQuery.data ?? [];

  function handleLangChange(next: Lang) {
    haptics.selection();
    setLang(next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          style={styles.header}
          onPress={() => {
            haptics.selection();
            router.push('/profile/edit');
          }}>
          <View style={[styles.avatar, avatarEmoji(me?.avatarUrl) ? styles.avatarEmojiBg : null]}>
            {avatarEmoji(me?.avatarUrl) ? (
              <Text style={styles.avatarEmoji}>{avatarEmoji(me?.avatarUrl)}</Text>
            ) : (
              <Text style={styles.avatarText}>
                {(me?.name?.[0] ?? me?.phone?.slice(-2) ?? 'Y').toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{me?.name ?? tr('profile.user')}</Text>
            <Text style={styles.phone}>{me?.phone}</Text>
          </View>
          {me?.isAdmin && <Badge label="ADMIN" tone="info" />}
          <View style={styles.editBtn}>
            <Pencil size={16} color={colors.brand.primary} strokeWidth={2.4} />
          </View>
        </Pressable>

        <Section title={tr('profile.section.myShops')}>
          {me?.isSellerApproved && myShopsQuery.data && myShopsQuery.data.length > 0
            ? myShopsQuery.data.map((shop) => (
                <Row
                  key={shop.id}
                  icon={Store}
                  iconBg={colors.brand.accentSurface}
                  iconColor={colors.brand.accent}
                  title={shop.name}
                  subtitle={`${shop.isOpenManual ? tr('profile.openShop') : tr('profile.closedShop')} · ${shop.address}`}
                  badge={shop.newOrderCount}
                  onPress={() => router.push(`/seller/${shop.id}/orders`)}
                />
              ))
            : null}

          <Pressable
            onPress={() => {
              haptics.medium();
              router.push('/seller/new');
            }}
            style={styles.applyCta}>
            <View style={styles.applyIcon}>
              <Plus size={22} color={colors.brand.accent} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.applyTitle}>Yangi do&apos;kon ochish</Text>
              <Text style={styles.applySub}>O&apos;z do&apos;koningizni oching va boshqaring</Text>
            </View>
            <ChevronRight size={18} color={colors.brand.accent} strokeWidth={2.4} />
          </Pressable>

          {!me?.isSellerApproved && latestApp?.status === 'pending' ? (
            <View style={styles.pendingCta}>
              <View style={styles.pendingIcon}>
                <Clock size={22} color={colors.feedback.warning} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>{tr('seller.pending.title')}</Text>
                <Text style={styles.applySub}>{tr('seller.pending.desc')}</Text>
              </View>
            </View>
          ) : null}

          {!me?.isSellerApproved && latestApp?.status === 'rejected' && latestApp.rejectionReason ? (
            <View style={styles.rejectedCta}>
              <View style={styles.rejectedIcon}>
                <XCircle size={22} color={colors.brand.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectedTitle}>{tr('seller.rejected.title')}</Text>
                <Text style={styles.applySub}>
                  {tr('seller.rejected.reason', { reason: latestApp.rejectionReason })}
                </Text>
              </View>
            </View>
          ) : null}
        </Section>

        {staffShops.length > 0 ? (
          <Section title={tr('profile.section.workingFor')}>
            {staffShops.map(({ shop, role }) => (
              <Row
                key={shop.id}
                icon={Store}
                iconBg={colors.feedback.infoSurface}
                iconColor={colors.feedback.info}
                title={shop.name}
                subtitle={`${role ?? tr('profile.staffRole')} · ${shop.address}`}
                onPress={() => router.push(`/seller/${shop.id}/orders`)}
              />
            ))}
          </Section>
        ) : null}

        <Section title={tr('profile.section.account')}>
          <Row
            icon={MapPin}
            iconBg={colors.brand.primarySurface}
            iconColor={colors.brand.primary}
            title={tr('profile.addresses')}
            onPress={() => router.push('/addresses')}
          />
          <Row
            icon={ClipboardList}
            iconBg={colors.feedback.infoSurface}
            iconColor={colors.feedback.info}
            title={tr('profile.orders')}
            onPress={() => router.push('/orders')}
          />
          <Row
            icon={QrCode}
            iconBg={colors.brand.accentSurface}
            iconColor={colors.brand.accent}
            title={tr('profile.joinAsStaff')}
            onPress={() => router.push('/staff-scan')}
          />
        </Section>

        <Section title={tr('profile.language')}>
          <View style={styles.langBox}>
            {(['uz', 'uz_cyrl', 'ru'] as Lang[]).map((l) => (
              <Pressable
                key={l}
                onPress={() => handleLangChange(l)}
                style={[styles.langItem, lang === l && styles.langItemActive]}>
                <Globe
                  size={16}
                  color={lang === l ? colors.brand.primary : colors.text.tertiary}
                  strokeWidth={2.2}
                />
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                  {LANG_LABELS[l]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title={tr('profile.section.other')}>
          <Row
            icon={LogOut}
            iconBg={colors.feedback.dangerSurface}
            iconColor={colors.brand.accent}
            title={tr('auth.signOut')}
            titleColor={colors.brand.accent}
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
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}
function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padding="none" elevation="xs">
        {children}
      </Card>
    </View>
  );
}

interface RowProps {
  icon: typeof MapPin;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  titleColor?: string;
  /** Optional count badge shown before the chevron (e.g. pending orders). */
  badge?: number;
  onPress: () => void;
}
function Row({ icon: Icon, iconBg, iconColor, title, subtitle, titleColor, badge, onPress }: RowProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg.surfaceMuted }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, titleColor && { color: titleColor }]}>{title}</Text>
        {subtitle && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.bg.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    borderWidth: 3,
    borderColor: colors.brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmojiBg: { backgroundColor: colors.brand.primarySurface, borderColor: colors.brand.primaryBorder },
  avatarEmoji: { fontSize: 34 },
  avatarText: { color: colors.text.onPrimary, fontSize: 24, fontWeight: '800' },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.h3 },
  phone: { ...typography.bodySmall, color: colors.text.secondary, marginTop: 2 },
  section: { gap: spacing.sm },
  sectionTitle: {
    ...typography.overline,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...typography.bodyStrong },
  rowSub: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
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
  applyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.brand.accentSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  applyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyTitle: { ...typography.h4, color: colors.brand.accent },
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
  langBox: { padding: spacing.sm, gap: 4 },
  langItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  langItemActive: { backgroundColor: colors.brand.primarySurface },
  langText: { ...typography.bodyStrong, color: colors.text.secondary },
  langTextActive: { color: colors.brand.primary },
});
