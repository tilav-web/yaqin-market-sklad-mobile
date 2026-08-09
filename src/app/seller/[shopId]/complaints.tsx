import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { NoPermissionNotice } from '@/components/seller/OwnerOnlyNotice';
import { api } from '@/lib/api';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { useTranslation } from '@/i18n';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface ShopComplaint {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerName: string | null;
  reason: string;
  description: string | null;
  status: 'open' | 'resolved';
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default function SellerComplaintsScreen() {
  const { tr } = useTranslation();
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  // Owner-only, same as balance/prime/tax-status — no dedicated staff permission exists for this.
  const access = useShopAccess(shopId);

  const complaintsQuery = useQuery({
    queryKey: ['shop-complaints', shopId],
    staleTime: 60_000,
    enabled: access.isOwner !== false,
    queryFn: async () => {
      const res = await api.get<ShopComplaint[]>(`/seller/shops/${shopId}/complaints`);
      return res.data;
    },
  });

  const items = complaintsQuery.data ?? [];

  if (access.isResolved && access.isOwner === false) {
    return <NoPermissionNotice />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={complaintsQuery.isFetching && !complaintsQuery.isLoading}
            onRefresh={() => {
              void complaintsQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        ListEmptyComponent={
          complaintsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon={AlertCircle}
              title={tr('sellerComplaints.empty')}
              description={tr('sellerComplaints.emptyDesc')}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={[styles.badge, item.status === 'open' ? styles.badgeOpen : styles.badgeResolved]}>
                <Text style={[styles.badgeText, item.status === 'open' ? styles.badgeTextOpen : styles.badgeTextResolved]}>
                  {item.status === 'open' ? tr('sellerComplaints.open') : tr('sellerComplaints.resolved')}
                </Text>
              </View>
              <Text style={styles.date}>{item.createdAt.slice(0, 10)}</Text>
            </View>
            <Text style={styles.orderLine}>
              #{item.orderNumber ?? item.orderId} · {item.customerName ?? ''}
            </Text>
            <Text style={styles.reason}>{item.reason}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            {item.status === 'resolved' && item.resolution ? (
              <View style={styles.resolutionBox}>
                <Text style={styles.resolutionLabel}>{tr('sellerComplaints.resolutionLabel')}</Text>
                <Text style={styles.resolutionText}>{item.resolution}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, gap: spacing.sm },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 4,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  badgeOpen: { backgroundColor: colors.feedback.warningSurface },
  badgeResolved: { backgroundColor: colors.feedback.successSurface },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextOpen: { color: colors.feedback.warning },
  badgeTextResolved: { color: colors.feedback.success },
  date: { ...typography.caption, color: colors.text.tertiary },
  orderLine: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
  reason: { ...typography.bodySmall, fontWeight: '600', color: colors.text.primary },
  description: { ...typography.bodySmall, color: colors.text.secondary },
  resolutionBox: {
    marginTop: 4,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceMuted,
  },
  resolutionLabel: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  resolutionText: { ...typography.caption, color: colors.text.primary, marginTop: 2 },
});
