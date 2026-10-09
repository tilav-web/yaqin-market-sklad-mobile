import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useGlobalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import {
  GrantBody,
  InviteQrModal,
  InviteResp,
  InviteSetupModal,
  StaffCard,
  StaffHeroCard,
  StaffPresetDto,
} from '@/components/seller-staff';
import { StaffMember } from '@/constants/staffPermissions';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { useIsShopOwner } from '@/lib/useIsShopOwner';

export default function StaffScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const [invite, setInvite] = useState<InviteResp | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const isOwner = useIsShopOwner(shopId);

  const staffQuery = useQuery({
    queryKey: ['shop-staff', shopId],
    staleTime: 60_000,
    enabled: isOwner !== false,
    queryFn: async () => {
      const res = await api.get<StaffMember[]>(`/seller/shops/${shopId}/staff`);
      return res.data;
    },
  });

  const presetsQuery = useQuery({
    queryKey: ['shop-staff-presets', shopId],
    staleTime: 60_000,
    enabled: isOwner !== false,
    queryFn: async () =>
      (await api.get<StaffPresetDto[]>(`/seller/shops/${shopId}/staff-presets`)).data,
  });

  useFocusEffect(
    useCallback(() => {
      void qc.invalidateQueries({ queryKey: ['shop-staff', shopId], refetchType: 'none' });
      void qc.invalidateQueries({ queryKey: ['shop-staff-presets', shopId], refetchType: 'none' });
    }, [qc, shopId]),
  );

  const inviteMutation = useMutation({
    mutationFn: async (body: GrantBody) => {
      const res = await api.post<InviteResp>(`/seller/shops/${shopId}/staff/invitations`, body);
      return res.data;
    },
    onSuccess: (data) => {
      setInvite(data);
      setSetupOpen(false);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!invite) return;
    const id = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [invite]);

  const active = (staffQuery.data ?? []).filter((s) => s.isActive);
  const customPresets = presetsQuery.data ?? [];

  if (isOwner === false) {
    return <OwnerOnlyNotice />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={staffQuery.isFetching && !staffQuery.isLoading}
            onRefresh={() => void staffQuery.refetch()}
            tintColor={Brand.red}
            colors={[Brand.red]}
          />
        }
      >
        <StaffHeroCard onAdd={() => setSetupOpen(true)} />

        <Text style={styles.sectionTitle}>
          Biriktirilgan xodimlar ({active.length})
        </Text>

        {staffQuery.isLoading ? (
          <ActivityIndicator color={Brand.red} style={{ marginTop: 30 }} />
        ) : active.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={40} color={Brand.gray400} />
            <Text style={styles.emptyTitle}>Hozircha xodimlar yo'q</Text>
            <Text style={styles.emptyText}>
              Do'koningizga kassir yoki omborchi qo'shish uchun "Yangi xodim qo'shish" tugmasini bosing
            </Text>
          </View>
        ) : (
          active.map((s) => (
            <StaffCard key={s.id} shopId={shopId} member={s} customPresets={customPresets} />
          ))
        )}
      </ScrollView>

      <InviteSetupModal
        visible={setupOpen}
        shopId={shopId}
        customPresets={customPresets}
        pending={inviteMutation.isPending}
        onCancel={() => setSetupOpen(false)}
        onSubmit={(body) => inviteMutation.mutate(body)}
      />

      <InviteQrModal
        invite={invite}
        nowTick={nowTick}
        onClose={() => setInvite(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  scroll: { padding: Spacing.four, gap: Spacing.three },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Brand.black, marginTop: Spacing.two },
  emptyCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Brand.gray200,
    marginTop: Spacing.two,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: Brand.gray800 },
  emptyText: { fontSize: 13, color: Brand.gray600, textAlign: 'center', lineHeight: 18 },
});
