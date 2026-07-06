import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router, useGlobalSearchParams } from 'expo-router';
import { BarChart3, Bell, BookOpen, ChevronRight, type LucideIcon, MessageSquare, Settings2, ShieldBan, Star, Store, Tag, Wallet } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShopAccess } from '@/lib/useIsShopOwner';
import { api } from '@/lib/api';
import { PublicShop, ShopCompleteness } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/**
 * Shop hub — a clean, profile-like landing for everything about the shop:
 * open/closed toggle up top, then organized links to settings, report and
 * staff (each its own screen). Keeps the bottom bar to 4 essentials.
 *
 * Reached by owners AND by staff who hold at least one of HUB_PERMISSIONS
 * (see seller/[shopId]/_layout.tsx) — each row below is shown only when the
 * current user actually has the permission that screen requires, instead of
 * blanket-hiding the whole hub for non-owners (that used to make e.g. a
 * `reviews.view`-only staff member unable to reach the reviews screen at
 * all, even though the server happily allows it).
 */
export default function SellerHubScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const access = useShopAccess(shopId);
  // Only staff, never the owner, hit this path — GET /seller/shops/:id is
  // strictly owner-only server-side (no staff permission unlocks it), so a
  // confirmed non-owner falls back to the PUBLIC shop endpoint instead
  // (same name/address/photos/isOpenManual fields) to render the header and
  // — for `shop.toggle_open` holders — the open/closed switch.
  const useOwnerEndpoint = access.isOwner !== false;

  const shopQuery = useQuery({
    queryKey: ['seller-shop', shopId, useOwnerEndpoint ? 'owner' : 'public'],
    staleTime: 60_000,
    enabled: access.isResolved,
    queryFn: async () => {
      const res = await api.get<PublicShop>(
        useOwnerEndpoint ? `/seller/shops/${shopId}` : `/shops/${shopId}`,
      );
      return res.data;
    },
  });

  const toggleOpen = useMutation({
    mutationFn: async (isOpen: boolean) => {
      await api.post(`/seller/shops/${shopId}/toggle-open`, { isOpen });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-shop', shopId] }),
  });

  const completenessQuery = useQuery({
    queryKey: ['shop-completeness', shopId],
    queryFn: async () => {
      const res = await api.get<ShopCompleteness>(`/seller/shops/${shopId}/completeness`);
      return res.data;
    },
    staleTime: 5 * 60_000,
    enabled: access.has('shop.settings.view'),
  });

  const shop = shopQuery.data;
  const isOpen = !!shop?.isOpenManual;
  const completeness = access.has('shop.settings.view') ? completenessQuery.data : undefined;
  const canToggleOpen = access.has('shop.toggle_open');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Shop header + open toggle */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.shopIcon}>
              <Store size={24} color={colors.brand.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName} numberOfLines={1}>
                {shop?.name ?? '…'}
              </Text>
              <Text style={styles.shopAddr} numberOfLines={1}>
                {shop?.address ?? ''}
              </Text>
            </View>
          </View>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: isOpen ? colors.feedback.success : colors.text.danger }]}>
                {isOpen ? '🟢 Ochiq' : '🔴 Yopiq'}
              </Text>
              <Text style={styles.toggleSub}>
                {isOpen ? 'Mijozlar buyurtma bera oladi' : "Mahsulotlaringiz ko'rinmaydi"}
              </Text>
            </View>
            {shopQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : canToggleOpen ? (
              <Switch
                value={isOpen}
                onValueChange={(v) => {
                  haptics.medium();
                  toggleOpen.mutate(v);
                }}
                trackColor={{ true: colors.feedback.success }}
                thumbColor={colors.bg.surface}
              />
            ) : null}
          </View>
        </View>

        {/* Shop completeness */}
        {completeness && completeness.score < 100 && (
          <View style={styles.completenessCard}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessTitle}>Do'kon profili</Text>
              <Text style={[styles.completenessScore, { color: completeness.score >= 70 ? colors.feedback.success : colors.feedback.warning }]}>
                {completeness.score}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completeness.score}%` as `${number}%`, backgroundColor: completeness.score >= 70 ? colors.feedback.success : colors.feedback.warning }]} />
            </View>
            <Text style={styles.completenessHint}>
              {completeness.items.filter((i) => !i.done).map((i) => i.label).slice(0, 2).join(' · ')}
            </Text>
          </View>
        )}

        {/* Management links — each shown only if the current user can actually
            use it (owner, or holds the specific permission that screen's
            server endpoint requires). */}
        <Text style={styles.sectionTitle}>Boshqaruv</Text>
        <View style={styles.group}>
          {[
            // Editing name/address/delivery zone hits GET+PATCH
            // /seller/shops/:id, which is strictly owner-only server-side
            // (no StaffPermission unlocks it) — owner-only in the UI too.
            access.isOwner !== false && {
              icon: Settings2,
              title: "Do'kon sozlamalari",
              subtitle: 'Nomi, manzil, rasm, yetkazib berish',
              onPress: () => router.push(`/seller/${shopId}/shop-settings`),
            },
            (access.has('promotions.view') || access.has('promotions.manage')) && {
              icon: Tag,
              title: 'Aksiyalar',
              subtitle: 'Chegirma va promokodlar boshqaruvi',
              onPress: () => router.push(`/seller/${shopId}/promotions` as Href),
            },
            access.has('inventory.product.create') && {
              icon: BookOpen,
              title: 'Global katalog',
              subtitle: 'Platforma mahsulotlaridan nusxa olish',
              onPress: () => router.push(`/seller/${shopId}/catalog` as Href),
            },
            access.has('orders.chat') && {
              icon: MessageSquare,
              title: 'Chat shablonlari',
              subtitle: 'Tez javob shablonlarini boshqarish',
              onPress: () => router.push(`/seller/${shopId}/chat-templates` as Href),
            },
            access.isOwner !== false && {
              icon: BarChart3,
              title: 'Hisobot',
              subtitle: 'Tushum, foyda, olib kelish kerak, muddat',
              onPress: () => router.push(`/seller/${shopId}/stats`),
            },
            access.has('reviews.view') && {
              icon: Star,
              title: 'Sharhlar',
              subtitle: 'Mijozlar qoldirgan sharh va baholar',
              onPress: () => router.push(`/seller/${shopId}/reviews`),
            },
            {
              icon: Bell,
              title: 'Bildirishnomalar',
              subtitle: 'Push tarixi',
              onPress: () => router.push('/notifications'),
            },
            access.isOwner !== false && {
              icon: ShieldBan,
              title: 'Bloklangan foydalanuvchilar',
              subtitle: "Bu do'kon uchun bloklangan mijozlar",
              onPress: () => router.push(`/seller/${shopId}/blocked`),
            },
            access.isOwner !== false && {
              icon: Wallet,
              title: "Balans va to'lovlar",
              subtitle: "Daromad, qarz, mablag' yechish",
              onPress: () => router.push(`/seller/${shopId}/balance`),
            },
            access.isOwner !== false && {
              icon: Star,
              title: 'Prime obuna',
              subtitle: 'Komissiyani kamaytirish uchun obuna',
              onPress: () => router.push(`/seller/${shopId}/prime`),
            },
          ]
            .filter((row): row is Exclude<typeof row, false> => row !== false)
            .map((row, i, arr) => (
              <Row key={row.title} {...row} last={i === arr.length - 1} />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.bg.surfaceMuted }]}>
      <View style={styles.rowIcon}>
        <Icon size={20} color={colors.brand.primary} strokeWidth={2.1} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  headerCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shopIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...typography.h4, color: colors.text.primary },
  shopAddr: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing.md,
  },
  toggleLabel: { ...typography.bodyStrong },
  toggleSub: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  sectionTitle: { ...typography.overline, color: colors.text.secondary, marginLeft: spacing.xs },
  group: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...typography.bodyStrong, color: colors.text.primary },
  rowSub: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  completenessCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  completenessHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completenessTitle: { ...typography.bodyStrong, color: colors.text.primary },
  completenessScore: { ...typography.h4 },
  progressBar: {
    height: 8,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  completenessHint: { ...typography.caption, color: colors.text.secondary, lineHeight: 16 },
});
