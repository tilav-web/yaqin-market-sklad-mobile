import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { AlertTriangle, CheckCircle, Star } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface PrimePlan {
  id: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string | null;
  commissionRate: string;
  description: string | null;
}
interface ActiveSub {
  id: string;
  planId: string;
  endDate: string;
  commissionRateSnapshot: string;
  plan: Pick<PrimePlan, 'name'>;
}

function fmt(v: string): string {
  return Number(v).toLocaleString('ru-RU') + " so'm";
}

export default function SellerPrimeScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [yearly, setYearly] = useState(false);
  // Prime billing is the seller's own identity, not shop-scoped — only the
  // owner has a seller/prime subscription to manage here.
  const isOwner = useIsShopOwner(shopId);

  const plansQ = useQuery<PrimePlan[]>({
    queryKey: ['prime-plans'],
    enabled: isOwner !== false,
    queryFn: async () => (await api.get('/seller/prime/plans')).data,
  });

  // IMPORTANT: a fetch error here must NOT be treated as "not subscribed" —
  // `GET /seller/prime/subscription` returns `null` (not an error) when there
  // genuinely is no active subscription, so any thrown error is a real
  // fetch/server problem. Swallowing it into `null` previously risked
  // showing the "Obuna bo'lish" button — and a duplicate charge — on an
  // already-active Prime shop during a transient outage.
  const subQ = useQuery<ActiveSub | null>({
    queryKey: ['prime-sub', shopId],
    enabled: isOwner !== false,
    queryFn: async () => (await api.get('/seller/prime/subscription')).data,
  });

  const subscribe = useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      api.post('/seller/prime/subscribe', { planId, yearly }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prime-sub'] });
      qc.invalidateQueries({ queryKey: ['seller-balance'] });
      Alert.alert('Muvaffaqiyat', 'Prime obuna faollashtirildi!');
    },
    onError: (e: unknown) => {
      const msg = (e as any)?.response?.data?.message ?? 'Xatolik yuz berdi';
      Alert.alert(tr('common.error'), msg);
    },
  });

  const activeSub = subQ.data;

  if (isOwner === false) {
    return <OwnerOnlyNotice />;
  }

  if (subQ.isLoading || plansQ.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (subQ.isError || plansQ.isError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          icon={AlertTriangle}
          title="Obuna holati yuklanmadi"
          description="Xavfsizlik uchun holat aniq bo'lmaguncha obuna bo'lish taklif etilmaydi. Internetni tekshirib, qayta urinib ko'ring."
          actionLabel="Qayta urinish"
          onAction={() => {
            void subQ.refetch();
            void plansQ.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Current subscription */}
        {activeSub && (
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <CheckCircle size={20} color={colors.feedback.success} />
              <Text style={styles.activeTitle}>Faol obuna: {activeSub.plan?.name}</Text>
            </View>
            <Text style={styles.activeSub}>
              Komissiya: {activeSub.commissionRateSnapshot}%  ·  Muddat: {activeSub.endDate}
            </Text>
          </View>
        )}

        {/* Period toggle */}
        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleBtn, !yearly && styles.toggleActive]}
            onPress={() => setYearly(false)}>
            <Text style={[styles.toggleText, !yearly && styles.toggleActiveText]}>Oylik</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, yearly && styles.toggleActive]}
            onPress={() => setYearly(true)}>
            <Text style={[styles.toggleText, yearly && styles.toggleActiveText]}>Yillik</Text>
          </Pressable>
        </View>

        {/* Plans */}
        {(plansQ.data ?? []).map((plan) => {
          // A plan may have no yearly price at all — fall back to monthly
          // billing for it specifically rather than mislabeling the monthly
          // price "/ yil" right before charging (the server does the same
          // fallback when computing the actual charge, see prime.service.ts).
          const yearlyAvailable = !!plan.yearlyPrice;
          const effectiveYearly = yearly && yearlyAvailable;
          const price = effectiveYearly ? plan.yearlyPrice! : plan.monthlyPrice;
          const isCurrent = activeSub?.planId === plan.id;
          return (
            <View key={plan.id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
              <View style={styles.planHeader}>
                <Star size={18} color={colors.brand.primary} strokeWidth={2} />
                <Text style={styles.planName}>{plan.name}</Text>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Joriy</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planPrice}>{fmt(price)} / {effectiveYearly ? 'yil' : 'oy'}</Text>
              {yearly && !yearlyAvailable && (
                <Text style={styles.planDesc}>Bu tarifda yillik variant yo'q — oylik narxda davom etadi</Text>
              )}
              <Text style={styles.planComm}>Komissiya: {plan.commissionRate}%</Text>
              {plan.description && (
                <Text style={styles.planDesc}>{plan.description}</Text>
              )}
              {!isCurrent && (
                <Pressable
                  style={[styles.subBtn, subscribe.isPending && { opacity: 0.6 }]}
                  disabled={subscribe.isPending}
                  onPress={() =>
                    Alert.alert(
                      'Obuna bo\'lish',
                      `${plan.name} tarifiga ${fmt(price)} / ${effectiveYearly ? 'yil' : 'oy'} to'laysiz. Davom etasizmi?`,
                      [
                        { text: 'Bekor', style: 'cancel' },
                        { text: 'Ha', onPress: () => subscribe.mutate({ planId: plan.id }) },
                      ],
                    )
                  }
                >
                  <Text style={styles.subBtnText}>Obuna bo'lish</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  activeCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: spacing.xs,
  },
  activeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  activeTitle: { ...typography.bodyStrong, color: colors.feedback.success },
  activeSub: { ...typography.caption, color: colors.text.secondary },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignSelf: 'center',
  },
  toggleBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xs, borderRadius: radius.full },
  toggleActive: { backgroundColor: colors.brand.primary },
  toggleText: { ...typography.body, color: colors.text.secondary },
  toggleActiveText: { color: '#fff', fontWeight: '600' },
  planCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  planCardActive: { borderColor: colors.brand.primary, borderWidth: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  planName: { ...typography.h4, color: colors.text.primary, flex: 1 },
  currentBadge: {
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  currentBadgeText: { ...typography.caption, color: colors.brand.primary, fontWeight: '600' },
  planPrice: { ...typography.h3, color: colors.text.primary },
  planComm: { ...typography.caption, color: colors.text.secondary },
  planDesc: { ...typography.caption, color: colors.text.tertiary },
  subBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  subBtnText: { ...typography.bodyStrong, color: '#fff' },
});
