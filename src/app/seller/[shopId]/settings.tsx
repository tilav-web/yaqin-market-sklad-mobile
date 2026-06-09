import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useGlobalSearchParams } from 'expo-router';
import { BarChart3, Bell, ChevronRight, type LucideIcon, Settings2, ShieldBan, Star, Store, Wallet } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/**
 * Shop hub — a clean, profile-like landing for everything about the shop:
 * open/closed toggle up top, then organized links to settings, report and
 * staff (each its own screen). Keeps the bottom bar to 4 essentials.
 */
export default function SellerHubScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();

  const shopQuery = useQuery({
    queryKey: ['seller-shop', shopId],
    queryFn: async () => {
      const res = await api.get<PublicShop>(`/seller/shops/${shopId}`);
      return res.data;
    },
  });

  const toggleOpen = useMutation({
    mutationFn: async (isOpen: boolean) => {
      await api.post(`/seller/shops/${shopId}/toggle-open`, { isOpen });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-shop', shopId] }),
  });

  const shop = shopQuery.data;
  const isOpen = !!shop?.isOpenManual;

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
                {isOpen ? 'Mijozlar buyurtma bera oladi' : 'Mahsulotlaringiz ko‘rinmaydi'}
              </Text>
            </View>
            {shopQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : (
              <Switch
                value={isOpen}
                onValueChange={(v) => {
                  haptics.medium();
                  toggleOpen.mutate(v);
                }}
                trackColor={{ true: colors.feedback.success }}
                thumbColor={colors.bg.surface}
              />
            )}
          </View>
        </View>

        {/* Management links */}
        <Text style={styles.sectionTitle}>Boshqaruv</Text>
        <View style={styles.group}>
          <Row
            icon={Settings2}
            title="Do‘kon sozlamalari"
            subtitle="Nomi, manzil, rasm, yetkazib berish"
            onPress={() => router.push(`/seller/${shopId}/shop-settings`)}
          />
          <Row
            icon={BarChart3}
            title="Hisobot"
            subtitle="Tushum, foyda, olib kelish kerak, muddat"
            onPress={() => router.push(`/seller/${shopId}/stats`)}
          />
          <Row
            icon={Star}
            title="Sharhlar"
            subtitle="Mijozlar qoldirgan sharh va baholar"
            onPress={() => router.push(`/seller/${shopId}/reviews`)}
          />
          <Row
            icon={Bell}
            title="Bildirishnomalar"
            subtitle="Push tarixi"
            onPress={() => router.push('/notifications')}
          />
          <Row
            icon={ShieldBan}
            title="Bloklangan foydalanuvchilar"
            subtitle="Bu do’kon uchun bloklangan mijozlar"
            onPress={() => router.push(`/seller/${shopId}/blocked`)}
          />
          <Row
            icon={Wallet}
            title="Balans va to’lovlar"
            subtitle="Daromad, qarz, mablag’ yechish"
            onPress={() => router.push(`/seller/${shopId}/balance`)}
          />
          <Row
            icon={Star}
            title="Prime obuna"
            subtitle="Komissiyani kamaytirish uchun obuna"
            onPress={() => router.push(`/seller/${shopId}/prime`)}
            last
          />
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
});
